// Filtre de modération du Blog 4D
// Détecte les mots/expressions interdits et plusieurs tentatives de contournement.

const MOTS_INTERDITS = [
    "abruti", "abrutie", "abrutis", "abruties",
    "andouille", "andouilles", "âne", "ane",
    "bâtard", "batard", "bâtarde", "batarde",
    "bouffon", "bouffonne", "connard", "connarde", "con", "conne", "cons",
    "crétin", "cretin", "crétine", "cretine", "débile", "debile",
    "enfoiré", "enfoire", "enfoirée", "enfoiree",
    "idiot", "idiote", "idiots", "idiotes",
    "imbécile", "imbecile", "imbéciles", "imbeciles",
    "salaud", "salaude", "salopard", "salop", "saloperie", "ordure", "pourriture",
    "merde", "merdes", "putain", "putain de", "pute", "putes",
    "salope", "salopes", "enculé", "encule", "enculée", "enculee", "enculer",
    "enculés", "encules", "foutre", "fous ta merde",
    "nique", "niquer", "nique ta", "va te faire foutre", "va te faire",
    "fils de pute", "fille de pute"
];

const MENACES_INTERDITES = [
    "je vais te tuer", "je vais vous tuer", "je vais le tuer", "je vais la tuer",
    "je vais vous faire du mal", "je vais te faire du mal",
    "tu vas mourir", "vous allez mourir",
    "je vais t'assassiner", "je vais vous assassiner",
    "je vais te frapper", "je vais vous frapper",
    "je vais te massacrer", "je vais vous massacrer"
];

function normaliserTexteModeration(texte) {
    return String(texte ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[0@]/g, "o")
        .replace(/[1!|]/g, "i")
        .replace(/3/g, "e")
        .replace(/4/g, "a")
        .replace(/5/g, "s")
        .replace(/7/g, "t")
        .replace(/\$/g, "s")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/(.)\1{2,}/g, "$1$1")
        .replace(/\s+/g, " ")
        .trim();
}

function contientTermeInterdit(texte, terme) {
    const texteNormalise = normaliserTexteModeration(texte);
    const termeNormalise = normaliserTexteModeration(terme);
    if (!termeNormalise) return false;

    const expression = termeNormalise
        .split(" ")
        .map(mot => mot.replace(/[.*+?^()|[\]\\]/g, "\\$&"))
        .join("\\s+");

    return new RegExp("(^|\\s)" + expression + "($|\\s)", "i").test(texteNormalise);
}

function contenuEstInterdit(texte) {
    return MOTS_INTERDITS.some(terme => contientTermeInterdit(texte, terme)) ||
        MENACES_INTERDITES.some(terme => contientTermeInterdit(texte, terme));
}

function analyserContenu(texte) {
    const termeInterdit = [...MOTS_INTERDITS, ...MENACES_INTERDITES]
        .find(terme => contientTermeInterdit(texte, terme));

    return {
        autorise: !termeInterdit,
        terme: termeInterdit || null
    };
}
