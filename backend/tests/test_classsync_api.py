"""ClassSync backend end-to-end pytest suite.
Covers: bootstrap, register (provisional lock, invite gating), class setup,
RBAC, subjects/events/announcements/homework CRUD, chat, scores, admin log.
Run: pytest /app/backend/tests/test_classsync_api.py -v
"""
import os
import subprocess
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://school-space-7.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module", autouse=True)
def reset_db():
    """Reset DB once for the whole module (workflow is stateful)."""
    subprocess.run(
        ["mongosh", "mongodb://localhost:27017/classsync_db", "--quiet", "--eval", "db.dropDatabase()"],
        capture_output=True, check=False,
    )
    subprocess.run(["sudo", "supervisorctl", "restart", "backend"], capture_output=True, check=False)
    # Wait for backend ready
    for _ in range(30):
        try:
            r = requests.get(f"{API}/", timeout=3)
            if r.status_code == 200:
                break
        except Exception:
            pass
        time.sleep(1)
    yield


# Shared state across tests in this module
state: dict = {}


def h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------- Public endpoints ----------
class TestPublic:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data == {"ok": True, "service": "classsync"}

    def test_bootstrap_empty(self):
        r = requests.get(f"{API}/bootstrap")
        assert r.status_code == 200
        data = r.json()
        assert data["has_class"] is False
        assert data["class"] is None


# ---------- Auth: first user + provisional lock ----------
class TestFirstRegisterAndLock:
    def test_first_register_ok(self):
        r = requests.post(f"{API}/auth/register", json={
            "name": "Marco", "surname": "Rossi",
            "username": "marco", "password": "password123",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["needs_class_setup"] is True
        assert data["user"]["role"] == "STUDENTE"  # provisional
        assert data["user"]["class_id"] is None
        assert data["access_token"]
        state["admin_token"] = data["access_token"]
        state["admin_id"] = data["user"]["id"]

    def test_second_register_blocked_by_provisional_lock(self):
        r = requests.post(f"{API}/auth/register", json={
            "name": "X", "surname": "Y",
            "username": "shouldfail", "password": "password123",
        })
        assert r.status_code == 409, r.text


# ---------- Class setup ----------
class TestClassSetup:
    def test_setup_class(self):
        r = requests.post(f"{API}/class/setup",
                          json={"name": "4B Info", "school": "ITIS"},
                          headers=h(state["admin_token"]))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] == "ADMIN"
        assert data["class"]["name"] == "4B Info"
        code = data["invite_code"]
        assert isinstance(code, str) and len(code) == 6
        assert all(c in "0123456789ABCDEF" for c in code)
        state["invite_code"] = code
        state["admin_token"] = data["access_token"]  # refreshed with class_id

    def test_setup_class_again_conflict(self):
        r = requests.post(f"{API}/class/setup",
                          json={"name": "again"},
                          headers=h(state["admin_token"]))
        assert r.status_code == 409

    def test_default_subjects_seeded(self):
        r = requests.get(f"{API}/subjects", headers=h(state["admin_token"]))
        assert r.status_code == 200
        subs = r.json()["subjects"]
        assert len(subs) >= 7
        names = {s["name"] for s in subs}
        assert {"Matematica", "Italiano", "Storia", "Inglese", "Informatica"} <= names
        state["subject_id"] = subs[0]["id"]


# ---------- Second user register (invite code enforcement) ----------
class TestSecondRegister:
    def test_no_invite_400(self):
        r = requests.post(f"{API}/auth/register", json={
            "name": "Luca", "surname": "Bianchi",
            "username": "luca_noinvite", "password": "password123",
        })
        assert r.status_code == 400

    def test_bad_invite_400(self):
        r = requests.post(f"{API}/auth/register", json={
            "name": "Luca", "surname": "Bianchi",
            "username": "luca_bad", "password": "password123",
            "invite_code": "ZZZZZZ",
        })
        assert r.status_code == 400

    def test_valid_invite_yields_studente(self):
        r = requests.post(f"{API}/auth/register", json={
            "name": "Luca", "surname": "Bianchi",
            "username": "luca", "password": "password123",
            "invite_code": state["invite_code"],
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] == "STUDENTE"
        assert data["user"]["class_id"] is not None
        assert data["needs_class_setup"] is False
        state["student_token"] = data["access_token"]
        state["student_id"] = data["user"]["id"]


# ---------- RBAC: STUDENTE forbidden ----------
class TestRBACForbidden:
    def _s(self):
        return h(state["student_token"])

    def test_patch_class(self):
        assert requests.patch(f"{API}/class", json={"name": "x"}, headers=self._s()).status_code == 403

    def test_post_subjects(self):
        assert requests.post(f"{API}/subjects", json={"name": "X"}, headers=self._s()).status_code == 403

    def test_post_events(self):
        r = requests.post(f"{API}/events", json={"title": "T", "type": "verifica", "date": "2026-01-01"}, headers=self._s())
        assert r.status_code == 403

    def test_post_announcements(self):
        r = requests.post(f"{API}/announcements", json={"title": "T", "body": "B"}, headers=self._s())
        assert r.status_code == 403

    def test_post_homework(self):
        r = requests.post(f"{API}/homework", json={"title": "T", "due_date": "2026-01-01"}, headers=self._s())
        assert r.status_code == 403

    def test_delete_ann_forbidden(self):
        # create as admin first
        r = requests.post(f"{API}/announcements", json={"title": "A", "body": "B"}, headers=h(state["admin_token"]))
        aid = r.json()["announcement"]["id"]
        state["ann_id"] = aid
        assert requests.delete(f"{API}/announcements/{aid}", headers=self._s()).status_code == 403

    def test_admin_dashboard_forbidden(self):
        assert requests.get(f"{API}/admin/dashboard", headers=self._s()).status_code == 403

    def test_admin_log_forbidden(self):
        assert requests.get(f"{API}/admin/log", headers=self._s()).status_code == 403

    def test_regen_invite_forbidden(self):
        assert requests.post(f"{API}/class/invite/regenerate", headers=self._s()).status_code == 403


# ---------- Admin capabilities ----------
class TestAdminActions:
    def _a(self):
        return h(state["admin_token"])

    def test_patch_class_partial(self):
        r = requests.patch(f"{API}/class", json={"description": "nuova descrizione"}, headers=self._a())
        assert r.status_code == 200
        cls = r.json()["class"]
        assert cls["description"] == "nuova descrizione"
        assert cls["name"] == "4B Info"  # unchanged

    def test_subject_crud(self):
        # create
        r = requests.post(f"{API}/subjects", json={"name": "Chimica", "order": 10}, headers=self._a())
        assert r.status_code == 200
        sid = r.json()["subject"]["id"]
        # patch
        r = requests.patch(f"{API}/subjects/{sid}", json={"name": "Chimica2", "color": "#fff"}, headers=self._a())
        assert r.status_code == 200
        assert r.json()["subject"]["name"] == "Chimica2"
        # delete
        r = requests.delete(f"{API}/subjects/{sid}", headers=self._a())
        assert r.status_code == 200
        assert r.json()["deleted"] == 1

    def test_event_create(self):
        r = requests.post(f"{API}/events",
                          json={"title": "Verifica Mate", "type": "verifica", "date": "2026-02-10", "subject_id": state["subject_id"]},
                          headers=self._a())
        assert r.status_code == 200
        state["event_id"] = r.json()["event"]["id"]

    def test_homework_create(self):
        r = requests.post(f"{API}/homework",
                          json={"title": "HW1", "due_date": "2026-02-15", "subject_id": state["subject_id"]},
                          headers=self._a())
        assert r.status_code == 200
        data = r.json()["homework"]
        assert data["completed"] is False
        state["hw_id"] = data["id"]

    def test_announcement_create_and_delete(self):
        r = requests.post(f"{API}/announcements", json={"title": "Ciao", "body": "prova"}, headers=self._a())
        assert r.status_code == 200
        aid = r.json()["announcement"]["id"]
        r = requests.delete(f"{API}/announcements/{aid}", headers=self._a())
        assert r.status_code == 200
        assert r.json()["deleted"] == 1


# ---------- Homework per-user toggle ----------
class TestHomeworkToggle:
    def test_admin_toggles(self):
        hid = state["hw_id"]
        r = requests.post(f"{API}/homework/{hid}/toggle", headers=h(state["admin_token"]))
        assert r.status_code == 200
        assert r.json()["completed"] is True
        # verify GET for admin
        lst = requests.get(f"{API}/homework", headers=h(state["admin_token"])).json()["homework"]
        me = next(x for x in lst if x["id"] == hid)
        assert me["completed"] is True

    def test_student_is_independent(self):
        hid = state["hw_id"]
        lst = requests.get(f"{API}/homework", headers=h(state["student_token"])).json()["homework"]
        me = next(x for x in lst if x["id"] == hid)
        assert me["completed"] is False  # student unaffected


# ---------- Chat + muting ----------
class TestChat:
    def test_student_post_message(self):
        r = requests.post(f"{API}/messages", json={"text": "ciao mondo"}, headers=h(state["student_token"]))
        assert r.status_code == 200
        state["msg_id"] = r.json()["message"]["id"]

    def test_admin_mutes_student(self):
        r = requests.patch(f"{API}/users/{state['student_id']}", json={"muted": True}, headers=h(state["admin_token"]))
        assert r.status_code == 200
        assert r.json()["user"]["muted"] is True

    def test_muted_cannot_post(self):
        r = requests.post(f"{API}/messages", json={"text": "muted?"}, headers=h(state["student_token"]))
        assert r.status_code == 403

    def test_admin_deletes_message_soft(self):
        r = requests.delete(f"{API}/messages/{state['msg_id']}", headers=h(state["admin_token"]))
        assert r.status_code == 200
        lst = requests.get(f"{API}/messages", headers=h(state["admin_token"])).json()["messages"]
        target = next(m for m in lst if m["id"] == state["msg_id"])
        assert target["deleted"] is True


# ---------- Announcements react + read ----------
class TestAnnouncements:
    def test_react_and_read(self):
        r = requests.post(f"{API}/announcements", json={"title": "R", "body": "body"}, headers=h(state["admin_token"]))
        aid = r.json()["announcement"]["id"]
        # student reacts + reads
        assert requests.post(f"{API}/announcements/{aid}/react", json={"emoji": "👍"}, headers=h(state["student_token"])).status_code == 200
        assert requests.post(f"{API}/announcements/{aid}/read", headers=h(state["student_token"])).status_code == 200
        lst = requests.get(f"{API}/announcements", headers=h(state["student_token"])).json()["announcements"]
        item = next(x for x in lst if x["id"] == aid)
        assert item["read"] is True
        assert item["read_count"] >= 1
        assert "👍" in item["reactions"]


# ---------- Duck jump scores ----------
class TestScores:
    def test_bounds(self):
        assert requests.post(f"{API}/scores", json={"score": -1}, headers=h(state["admin_token"])).status_code == 400
        assert requests.post(f"{API}/scores", json={"score": 100001}, headers=h(state["admin_token"])).status_code == 400

    def test_personal_best_keeps_max(self):
        assert requests.post(f"{API}/scores", json={"score": 50}, headers=h(state["admin_token"])).status_code == 200
        r = requests.post(f"{API}/scores", json={"score": 25}, headers=h(state["admin_token"]))
        assert r.status_code == 200
        assert r.json()["personal_best"] == 50  # not overwritten downward
        r = requests.post(f"{API}/scores", json={"score": 200}, headers=h(state["admin_token"]))
        assert r.json()["personal_best"] == 200

    def test_leaderboard_desc(self):
        requests.post(f"{API}/scores", json={"score": 10}, headers=h(state["student_token"]))
        lst = requests.get(f"{API}/scores", headers=h(state["admin_token"])).json()["leaderboard"]
        scores = [s["score"] for s in lst]
        assert scores == sorted(scores, reverse=True)


# ---------- Auth: me + disabled user ----------
class TestMeAndDisabled:
    def test_missing_token_401(self):
        assert requests.get(f"{API}/auth/me").status_code == 401

    def test_me_ok(self):
        r = requests.get(f"{API}/auth/me", headers=h(state["admin_token"]))
        assert r.status_code == 200

    def test_disabled_user_401(self):
        # admin disables student
        r = requests.patch(f"{API}/users/{state['student_id']}", json={"disabled": True}, headers=h(state["admin_token"]))
        assert r.status_code == 200
        # student's existing token should now fail
        r = requests.get(f"{API}/auth/me", headers=h(state["student_token"]))
        assert r.status_code == 401


# ---------- Admin log ----------
class TestAdminLog:
    def test_log_has_entries(self):
        r = requests.get(f"{API}/admin/log", headers=h(state["admin_token"]))
        assert r.status_code == 200
        entries = r.json()["log"]
        actions = {e["action"] for e in entries}
        # We know class.created, class.updated, user.updated happened
        assert "class.created" in actions
        assert "class.updated" in actions
