document.addEventListener("DOMContentLoaded", () => {
    /* ==========================================
     * NAVIGATION
     * ========================================== */
    const liens = document.querySelectorAll(".nav-link");
    const pageActuelle = window.location.pathname.split("/").pop() || "index.html";

    liens.forEach((lien) => {
        const href = lien.getAttribute("href") || "";
        const pageLien = href.split("/").pop().split("#")[0];
        lien.classList.toggle("active", pageLien === pageActuelle);
    });

    /* ==========================================
     * COMPTEUR DES VACANCES
     * ========================================== */
    const nomVacances = document.getElementById("nom-vacances");
    const compteur = document.getElementById("compteur");
    const dateVacances = document.getElementById("date-vacances");

    if (nomVacances && compteur && dateVacances) {
        const vacances = [
            { nom: "Vacances de la Toussaint", date: "2026-10-17T00:00:00+02:00" },
            { nom: "Vacances de Noël", date: "2026-12-19T00:00:00+01:00" },
            { nom: "Vacances d'hiver", date: "2027-02-06T00:00:00+01:00" },
            { nom: "Vacances de printemps", date: "2027-04-03T00:00:00+02:00" },
            { nom: "Grandes vacances", date: "2027-07-03T00:00:00+02:00" }
        ];

        function mettreAJourCompteur() {
            const maintenant = new Date();
            const prochaine = vacances.find((vacance) => new Date(vacance.date) > maintenant);

            if (!prochaine) {
                nomVacances.textContent = "Toutes les vacances sont passées";
                compteur.textContent = "Profitez bien !";
                dateVacances.textContent = "";
                return;
            }

            const dateCible = new Date(prochaine.date);
            const difference = Math.max(0, dateCible - maintenant);
            const totalSecondes = Math.floor(difference / 1000);
            const jours = Math.floor(totalSecondes / 86400);
            const semaines = Math.floor(jours / 7);
            const heures = Math.floor((totalSecondes % 86400) / 3600);
            const minutes = Math.floor((totalSecondes % 3600) / 60);
            const secondes = totalSecondes % 60;

            nomVacances.textContent = prochaine.nom;
            compteur.textContent = `${jours} jours • ${semaines} semaines • ${heures} h ${minutes} min ${secondes} s`;
            dateVacances.textContent = `Début : ${dateCible.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            })}`;
        }

        mettreAJourCompteur();
        setInterval(mettreAJourCompteur, 1000);
    }

    /* ==========================================
     * RETOUR EN HAUT
     * ========================================== */
    const boutonRetour = document.getElementById("back-to-top");

    if (boutonRetour) {
        const gererBoutonRetour = () => {
            boutonRetour.classList.toggle("visible", window.scrollY > 500);
        };

        window.addEventListener("scroll", gererBoutonRetour, { passive: true });
        boutonRetour.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
        gererBoutonRetour();
    }

    /* ==========================================
     * ANIMATIONS
     * ========================================== */
    const elements = document.querySelectorAll(".section-card, .hero-section");

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.style.animationPlayState = "running";
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });

        elements.forEach((element) => {
            element.style.animationPlayState = "paused";
            observer.observe(element);
        });
    }

    console.log("Blog des 4èmes D chargé !");
});

/* ==========================================
 * COMPTE
 * ========================================== */
async function mettreAJourCompte() {
    const lien = document.getElementById("account-link");
    if (!lien || typeof utilisateurConnecte !== "function") return;

    try {
        const utilisateur = await utilisateurConnecte();

        if (utilisateur) {
            lien.textContent = "Mon compte";
            lien.href = "compte.html";
        } else {
            lien.textContent = "Se connecter";
            lien.href = "connexion.html";
        }
    } catch (error) {
        console.error("Erreur lors de la vérification du compte :", error);
        lien.textContent = "Se connecter";
        lien.href = "connexion.html";
    }
}

// auth.js est chargé avant script.js sur les pages principales.
// On attend tout de même le DOM pour éviter les accès prématurés.
document.addEventListener("DOMContentLoaded", mettreAJourCompte);