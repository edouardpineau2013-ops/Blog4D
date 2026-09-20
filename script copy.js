document.addEventListener("DOMContentLoaded", () => {

    /*
     * ==========================================
     * NAVIGATION
     * ==========================================
     */

    const liens = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll("main section[id]");

    function mettreAJourNavigation() {
        const position = window.scrollY + 130;

        let sectionActuelle = "accueil";

        sections.forEach((section) => {
            if (position >= section.offsetTop) {
                sectionActuelle = section.id;
            }
        });

        liens.forEach((lien) => {
            const cible = lien.getAttribute("href").substring(1);

            lien.classList.toggle(
                "active",
                cible === sectionActuelle
            );
        });
    }

    window.addEventListener(
        "scroll",
        mettreAJourNavigation,
        { passive: true }
    );

    mettreAJourNavigation();


    /*
     * ==========================================
     * COMPTE À REBOURS DES VACANCES
     * ==========================================
     */

    const vacances = [
        {
            nom: "Vacances de la Toussaint",
            date: "2026-10-17T00:00:00"
        },
        {
            nom: "Vacances de Noël",
            date: "2026-12-19T00:00:00"
        },
        {
            nom: "Vacances d'hiver",
            date: "2027-02-06T00:00:00"
        },
        {
            nom: "Vacances de printemps",
            date: "2027-04-03T00:00:00"
        },
        {
            nom: "Grandes vacances",
            date: "2027-07-03T00:00:00"
        }
    ];

    const nomVacances = document.getElementById("nom-vacances");
    const compteur = document.getElementById("compteur");
    const dateVacances = document.getElementById("date-vacances");

    function mettreAJourCompteur() {

        const maintenant = new Date();

        const prochaine = vacances.find((vacance) => {
            return new Date(vacance.date) > maintenant;
        });

        if (!prochaine) {
            nomVacances.textContent = "Toutes les vacances sont passées";
            compteur.textContent = "🎉 Profitez bien !";
            dateVacances.textContent = "";
            return;
        }

        const dateCible = new Date(prochaine.date);
        const difference = dateCible - maintenant;

        const jours = Math.floor(
            difference / (1000 * 60 * 60 * 24)
        );

        const semaines = Math.floor(jours / 7);

        const heures = Math.floor(
            (difference % (1000 * 60 * 60 * 24)) /
            (1000 * 60 * 60)
        );

        const minutes = Math.floor(
            (difference % (1000 * 60 * 60)) /
            (1000 * 60)
        );

        const secondes = Math.floor(
            (difference % (1000 * 60)) /
            1000
        );

        nomVacances.textContent = prochaine.nom;

        compteur.textContent =
            `${jours} jours • ${semaines} semaines • ` +
            `${heures} h ${minutes} min ${secondes} s`;

        dateVacances.textContent =
            `Début : ${dateCible.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            })}`;
    }

    mettreAJourCompteur();

    setInterval(mettreAJourCompteur, 1000);


    /*
     * ==========================================
     * BOUTON RETOUR EN HAUT
     * ==========================================
     */

    const boutonRetour = document.getElementById("back-to-top");

    function gererBoutonRetour() {

        if (window.scrollY > 500) {
            boutonRetour.classList.add("visible");
        } else {
            boutonRetour.classList.remove("visible");
        }
    }

    window.addEventListener(
        "scroll",
        gererBoutonRetour,
        { passive: true }
    );

    boutonRetour.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    gererBoutonRetour();


    /*
     * ==========================================
     * ANIMATION D'APPARITION
     * ==========================================
     */

    const elements = document.querySelectorAll(
        ".section-card, .hero-section"
    );

    const observer = new IntersectionObserver(
        (entries) => {

            entries.forEach((entry) => {

                if (entry.isIntersecting) {
                    entry.target.style.animationPlayState = "running";
                    observer.unobserve(entry.target);
                }

            });

        },
        {
            threshold: 0.08
        }
    );

    elements.forEach((element) => {
        element.style.animationPlayState = "paused";
        observer.observe(element);
    });


    console.log("Blog des 4èmes D chargé !");
});