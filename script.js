document.addEventListener("DOMContentLoaded", () => {

    /*
     * ==========================================
     * NAVIGATION
     * ==========================================
     */

    const liens = document.querySelectorAll(".nav-link");

    const pageActuelle =
        window.location.pathname
            .split("/")
            .pop() || "index.html";

    liens.forEach((lien) => {

        const pageLien =
            lien.getAttribute("href")
                .split("/")
                .pop();

        if (pageLien === pageActuelle) {
            lien.classList.add("active");
        } else {
            lien.classList.remove("active");
        }

    });


    /*
     * ==========================================
     * COMPTEUR DES VACANCES
     * ==========================================
     */

    const nomVacances =
        document.getElementById("nom-vacances");

    const compteur =
        document.getElementById("compteur");

    const dateVacances =
        document.getElementById("date-vacances");


    // Le compteur n'existe que sur index.html.
    // On arrête donc ici pour les autres pages.
    if (nomVacances && compteur && dateVacances) {

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


        function mettreAJourCompteur() {

            const maintenant = new Date();

            const prochaine = vacances.find((vacance) => {
                return new Date(vacance.date) > maintenant;
            });


            if (!prochaine) {

                nomVacances.textContent =
                    "Toutes les vacances sont passées";

                compteur.textContent =
                    "🎉 Profitez bien !";

                dateVacances.textContent = "";

                return;
            }


            const dateCible =
                new Date(prochaine.date);

            const difference =
                dateCible - maintenant;


            const jours =
                Math.floor(
                    difference /
                    (1000 * 60 * 60 * 24)
                );


            const semaines =
                Math.floor(jours / 7);


            const heures =
                Math.floor(
                    (
                        difference %
                        (1000 * 60 * 60 * 24)
                    ) /
                    (1000 * 60 * 60)
                );


            const minutes =
                Math.floor(
                    (
                        difference %
                        (1000 * 60 * 60)
                    ) /
                    (1000 * 60)
                );


            const secondes =
                Math.floor(
                    (
                        difference %
                        (1000 * 60)
                    ) /
                    1000
                );


            nomVacances.textContent =
                prochaine.nom;


            compteur.textContent =
                `${jours} jours • ${semaines} semaines • ` +
                `${heures} h ${minutes} min ${secondes} s`;


            dateVacances.textContent =
                `Début : ${dateCible.toLocaleDateString(
                    "fr-FR",
                    {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }
                )}`;
        }


        mettreAJourCompteur();

        setInterval(mettreAJourCompteur, 1000);

    }


    /*
     * ==========================================
     * RETOUR EN HAUT
     * ==========================================
     */

    const boutonRetour =
        document.getElementById("back-to-top");


    if (boutonRetour) {

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


        boutonRetour.addEventListener(
            "click",
            () => {

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );


        gererBoutonRetour();

    }


    /*
     * ==========================================
     * ANIMATIONS
     * ==========================================
     */

    const elements =
        document.querySelectorAll(
            ".section-card, .hero-section"
        );


    if ("IntersectionObserver" in window) {

        const observer =
            new IntersectionObserver(
                (entries) => {

                    entries.forEach((entry) => {

                        if (entry.isIntersecting) {

                            entry.target.style.animationPlayState =
                                "running";

                            observer.unobserve(
                                entry.target
                            );

                        }

                    });

                },
                {
                    threshold: 0.08
                }
            );


        elements.forEach((element) => {

            element.style.animationPlayState =
                "paused";

            observer.observe(element);

        });

    }


    console.log("Blog des 4èmes D chargé !");

});