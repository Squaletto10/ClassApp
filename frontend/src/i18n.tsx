// Language provider + strings (IT/EN)
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type Lang = "it" | "en";

const STRINGS = {
  it: {
    welcome: "Benvenuto", login: "Accedi", register: "Registrati", logout: "Esci",
    username: "Username", password: "Password", name: "Nome", surname: "Cognome",
    inviteCode: "Codice classe", createClass: "Configura la tua classe",
    className: "Nome classe", school: "Scuola", schoolYear: "Anno scolastico",
    section: "Sezione", description: "Descrizione", primaryColor: "Colore primario",
    secondaryColor: "Colore secondario", vicerep: "Vice-rappresentante",
    home: "Home", materials: "Materiale", calendar: "Calendario", chat: "Chat", more: "Altro",
    homework: "Compiti", announcements: "Annunci", classMembers: "Classe",
    profile: "Profilo", settings: "Impostazioni", adminPanel: "Pannello Admin",
    duckJump: "Duck Jump", subjects: "Materie", inviteCodeShort: "Codice",
    upcoming: "Prossimi eventi", latestAnnouncement: "Ultimo annuncio",
    latestNotes: "Ultimi appunti", quickAccess: "Accesso rapido",
    empty_notes: "Non ci sono ancora appunti", empty_events: "Nessun evento programmato",
    empty_hw: "Tutto fatto! Nessun compito da svolgere.",
    empty_ann: "Nessun annuncio al momento", empty_chat: "Inizia la conversazione!",
    important: "IMPORTANTE", saveScore: "Salva punteggio", gameOver: "Game Over",
    tapToStart: "Tocca per iniziare", score: "Punteggio", best: "Record",
    leaderboard: "Classifica", tryAgain: "Riprova", continue: "Continua",
    send: "Invia", reply: "Rispondi", pin: "Fissa", favorite: "Preferito",
    delete: "Elimina", edit: "Modifica", create: "Crea", cancel: "Annulla",
    save: "Salva", title: "Titolo", body: "Testo", date: "Data", time: "Ora",
    subject: "Materia", noAccount: "Non hai un account?", hasAccount: "Hai già un account?",
    firstAdmin: "Sarai l'amministratore della classe",
    joinWithCode: "Inserisci il codice fornito dal rappresentante",
    theme: "Tema", light: "Chiaro", dark: "Scuro", auto: "Automatico",
    settingsHeader: "Impostazioni",
    themeFollowsSystem: "Segue automaticamente le impostazioni del sistema.",
    language: "Lingua", italian: "Italiano", english: "Inglese",
    changePassword: "Cambia password", oldPassword: "Vecchia password", newPassword: "Nuova password",
    users: "Utenti", disable: "Disabilita", enable: "Abilita", mute: "Silenzia", unmute: "Riattiva",
    role: "Ruolo", admin: "Admin", student: "Studente",
    regenerateCode: "Rigenera codice", copyCode: "Copia codice",
    dashboard: "Dashboard", auditLog: "Registro attività",
    verifica: "Verifica", interrogazione: "Interrogazione", compito: "Compito",
    evento: "Evento", consegna: "Consegna", gita: "Gita", assemblea: "Assemblea", altro: "Altro",
    typeMessage: "Scrivi un messaggio...", messageDeleted: "Messaggio eliminato",
    uploadedBy: "Caricato da", newNote: "Nuovo appunto", newEvent: "Nuovo evento",
    newAnnouncement: "Nuovo annuncio", newHomework: "Nuovo compito",
    completed: "Completato", todo: "Da fare", uploadFile: "Carica file",
    joinClass: "Unisciti alla classe", createFirstClass: "Crea la prima classe",
    setupYourClass: "Configura la tua classe", bio: "Bio",
    myProfile: "Il mio profilo", classInfo: "Info classe",
    representative: "Rappresentante", searchPlaceholder: "Cerca...",
    all: "Tutti", read: "letto", readCount: "letture",
    polls: "Sondaggi", board: "Bacheca",
    newPoll: "Nuovo sondaggio", question: "Domanda", options: "Opzioni",
    addOption: "+ Aggiungi opzione", vote: "Vota", close: "Chiudi", closed: "Chiuso",
    votes: "voti", empty_polls: "Nessun sondaggio al momento",
    empty_board: "La bacheca è vuota. Lascia un messaggio!",
    postNote: "Pubblica nota", writeSomething: "Scrivi qualcosa...",
  },
  en: {
    welcome: "Welcome", login: "Login", register: "Register", logout: "Logout",
    username: "Username", password: "Password", name: "First name", surname: "Last name",
    inviteCode: "Class code", createClass: "Set up your class",
    className: "Class name", school: "School", schoolYear: "School year",
    section: "Section", description: "Description", primaryColor: "Primary color",
    secondaryColor: "Secondary color", vicerep: "Vice representative",
    home: "Home", materials: "Materials", calendar: "Calendar", chat: "Chat", more: "More",
    homework: "Homework", announcements: "Announcements", classMembers: "Class",
    profile: "Profile", settings: "Settings", adminPanel: "Admin Panel",
    duckJump: "Duck Jump", subjects: "Subjects", inviteCodeShort: "Code",
    upcoming: "Upcoming events", latestAnnouncement: "Latest announcement",
    latestNotes: "Latest notes", quickAccess: "Quick access",
    empty_notes: "No notes yet", empty_events: "No events scheduled",
    empty_hw: "All done! No homework.", empty_ann: "No announcements yet",
    empty_chat: "Start the conversation!",
    important: "IMPORTANT", saveScore: "Save score", gameOver: "Game Over",
    tapToStart: "Tap to start", score: "Score", best: "Best",
    leaderboard: "Leaderboard", tryAgain: "Try again", continue: "Continue",
    send: "Send", reply: "Reply", pin: "Pin", favorite: "Favorite",
    delete: "Delete", edit: "Edit", create: "Create", cancel: "Cancel",
    save: "Save", title: "Title", body: "Text", date: "Date", time: "Time",
    subject: "Subject", noAccount: "No account?", hasAccount: "Already have an account?",
    firstAdmin: "You will be the class administrator",
    joinWithCode: "Enter the code from your class representative",
    theme: "Theme", light: "Light", dark: "Dark", auto: "Auto",
    settingsHeader: "Settings",
    themeFollowsSystem: "Follows your device settings automatically.",
    language: "Language", italian: "Italian", english: "English",
    changePassword: "Change password", oldPassword: "Old password", newPassword: "New password",
    users: "Users", disable: "Disable", enable: "Enable", mute: "Mute", unmute: "Unmute",
    role: "Role", admin: "Admin", student: "Student",
    regenerateCode: "Regenerate code", copyCode: "Copy code",
    dashboard: "Dashboard", auditLog: "Activity log",
    verifica: "Test", interrogazione: "Oral test", compito: "Homework",
    evento: "Event", consegna: "Deadline", gita: "Trip", assemblea: "Assembly", altro: "Other",
    typeMessage: "Type a message...", messageDeleted: "Message deleted",
    uploadedBy: "Uploaded by", newNote: "New note", newEvent: "New event",
    newAnnouncement: "New announcement", newHomework: "New homework",
    completed: "Done", todo: "To do", uploadFile: "Upload file",
    joinClass: "Join class", createFirstClass: "Create first class",
    setupYourClass: "Set up your class", bio: "Bio",
    myProfile: "My profile", classInfo: "Class info",
    representative: "Representative", searchPlaceholder: "Search...",
    all: "All", read: "read", readCount: "reads",
    polls: "Polls", board: "Board",
    newPoll: "New poll", question: "Question", options: "Options",
    addOption: "+ Add option", vote: "Vote", close: "Close", closed: "Closed",
    votes: "votes", empty_polls: "No polls yet",
    empty_board: "The board is empty. Leave a message!",
    postNote: "Post note", writeSomething: "Write something...",
  },
};

type Ctx = { lang: Lang; t: (k: keyof typeof STRINGS.it) => string; setLang: (l: Lang) => void };
const I18nContext = createContext<Ctx>({ lang: "it", t: (k) => STRINGS.it[k] || (k as string), setLang: () => {} });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("it");
  useEffect(() => {
    AsyncStorage.getItem("cs.lang").then((v) => { if (v === "it" || v === "en") setLangState(v); });
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem("cs.lang", l).catch(() => {});
  };
  const t = (k: keyof typeof STRINGS.it) => STRINGS[lang][k] ?? (k as string);
  return <I18nContext.Provider value={{ lang, t, setLang }}>{children}</I18nContext.Provider>;
}
export const useI18n = () => useContext(I18nContext);
