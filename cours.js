document.addEventListener("DOMContentLoaded", async () => {
    const liste = document.getElementById("liste-cours");
    const formulaire = document.getElementById("form-cours");
    const messageConnexion = document.getElementById("message-connexion-cours");
    const imageInput = document.getElementById("image");
    const apercu = document.getElementById("apercu-image");
    const lightbox = document.getElementById("course-lightbox");
    const lightboxMatiere = document.getElementById("lightbox-matiere");
    const lightboxTitre = document.getElementById("lightbox-titre");
    const lightboxContenu = document.getElementById("lightbox-contenu");
    const lightboxImages = document.getElementById("lightbox-images");
    const lightboxAuteur = document.getElementById("lightbox-auteur");
    if (!liste) return;

    const echapperHTML = texte => String(texte ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[c]));
    const afficherDate = date => new Date(date).toLocaleString("fr-FR", {dateStyle:"long", timeStyle:"short"});
    const nomFichier = fichier => `cours/${crypto.randomUUID()}-${fichier.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const obtenirImages = valeur => {
        if (!valeur) return [];
        try {
            const parsed = JSON.parse(valeur);
            if (Array.isArray(parsed)) return parsed.filter(Boolean);
        } catch {}
        return [valeur];
    };
    const stockerImages = images => images.length === 1 ? images[0] : JSON.stringify(images);

    function fermerLightbox() {
        if (!lightbox) return;
        lightbox.hidden = true;
        document.body.classList.remove("lightbox-open");
    }

    function ouvrirLightbox(cours) {
        if (!lightbox) return;
        const images = obtenirImages(cours.image_url);
        lightboxMatiere.textContent = cours.matiere || "Cours";
        lightboxTitre.textContent = cours.titre || "Cours";
        lightboxContenu.innerHTML = cours.contenu
            ? echapperHTML(cours.contenu).replace(/\n/g, "<br>")
            : "";
        lightboxImages.innerHTML = images.map((url, index) =>
            `<a href="${echapperHTML(url)}" target="_blank" rel="noopener">
                <img src="${echapperHTML(url)}" alt="Photo ${index + 1} du cours : ${echapperHTML(cours.titre)}">
            </a>`
        ).join("");
        lightboxAuteur.innerHTML = `Publié par <strong>${echapperHTML(cours.auteur_identifiant || "Utilisateur")}</strong>${cours.updated_at ? ` · modifié le ${afficherDate(cours.updated_at)}` : ""}`;
        lightbox.hidden = false;
        document.body.classList.add("lightbox-open");
    }

    document.querySelectorAll("[data-lightbox-close]").forEach(element => element.addEventListener("click", fermerLightbox));
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") fermerLightbox();
    });

    async function chargerCours() {
        liste.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><h3>Chargement...</h3></div>';
        const {data, error} = await supabaseClient.from("cours").select("id,titre,matiere,contenu,image_url,created_at,updated_at,auteur_id,auteur_identifiant").order("created_at", {ascending:false});
        if (error) {
            console.error(error);
            liste.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Impossible de charger les cours</h3><p>Vérifie la configuration Supabase.</p></div>';
            return;
        }
        if (!data.length) {
            liste.innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><h3>Aucun cours pour le moment</h3><p>Le premier cours peut être ajouté par un membre connecté.</p></div>';
            return;
        }

        const admin = await estAdmin();
        liste.innerHTML = data.map(c => {
            const images = obtenirImages(c.image_url);
            const apercuImage = images[0] || "";
            return `
            <article class="course-card" data-course-id="${c.id}">
                <div class="article-top"><span class="article-tag">${echapperHTML(c.matiere)}</span><span class="article-date">${afficherDate(c.created_at)}</span></div>
                <h3>${echapperHTML(c.titre)}</h3>
                ${c.contenu ? `<p class="course-content">${echapperHTML(c.contenu).replace(/\n/g,"<br>")}</p>` : ""}
                ${apercuImage ? `<div class="course-image-link"><img class="course-image" src="${echapperHTML(apercuImage)}" alt="Photo du cours : ${echapperHTML(c.titre)}" loading="lazy">${images.length > 1 ? `<span class="course-image-count">+${images.length - 1} photo${images.length > 2 ? "s" : ""}</span>` : ""}</div>` : ""}
                <div class="post-author">Publié par <strong>${echapperHTML(c.auteur_identifiant || "Utilisateur")}</strong>${c.updated_at ? ` · modifié le ${afficherDate(c.updated_at)}` : ""}</div>
                ${admin ? `<div class="admin-actions"><button type="button" class="danger-button admin-delete" data-id="${c.id}" data-images='${echapperHTML(JSON.stringify(images))}'>Supprimer</button></div>` : ""}
            </article>`;
        }).join("");

        liste.querySelectorAll(".course-card").forEach(card => {
            const cours = data.find(c => String(c.id) === card.dataset.courseId);
            card.addEventListener("click", event => {
                if (event.target.closest(".admin-actions")) return;
                if (cours) ouvrirLightbox(cours);
            });
        });

        if (!admin) return;
        liste.querySelectorAll(".admin-delete").forEach(button => button.addEventListener("click", async event => {
            event.stopPropagation();
            if (!confirm("Supprimer définitivement ce cours ?")) return;
            button.disabled = true;
            const id = button.dataset.id;
            let images = [];
            try { images = JSON.parse(button.dataset.images || "[]"); } catch {}

            const {data: deleted, error} = await supabaseClient.from("cours").delete().eq("id", id).select("id");
            if (error) {
                button.disabled = false;
                alert("Suppression impossible : " + error.message);
                return;
            }
            if (images.length) {
                const chemins = images.map(url => {
                    const match = String(url).match(/\/storage\/v1\/object\/public\/cours\/(.+)$/);
                    return match ? decodeURIComponent(match[1]) : null;
                }).filter(Boolean);
                if (chemins.length) await supabaseClient.storage.from("cours").remove(chemins);
            }
            if (!deleted?.length) {
                button.disabled = false;
                alert("Aucun cours n’a été supprimé. Vérifie les politiques RLS Supabase.");
                return;
            }
            await chargerCours();
        }));
    }

    imageInput?.addEventListener("change", () => {
        const fichiers = Array.from(imageInput.files || []);
        if (!fichiers.length) {
            apercu.hidden = true;
            apercu.innerHTML = "";
            return;
        }
        const invalide = fichiers.find(fichier => !fichier.type.startsWith("image/") || fichier.size > 10 * 1024 * 1024);
        if (invalide) {
            imageInput.value = "";
            apercu.hidden = true;
            apercu.innerHTML = "";
            return alert("Chaque photo doit être une image de 10 Mo maximum.");
        }
        apercu.innerHTML = fichiers.map((fichier, index) => {
            const url = URL.createObjectURL(fichier);
            return `<div class="course-preview-item"><img class="course-image" src="${url}" alt="Aperçu de la photo ${index + 1}"></div>`;
        }).join("");
        apercu.hidden = false;
    });

    try {
        const utilisateur = await utilisateurConnecte();
        if (formulaire && messageConnexion) {
            formulaire.hidden = !utilisateur;
            messageConnexion.hidden = !!utilisateur;
        }

        if (formulaire) formulaire.addEventListener("submit", async event => {
            event.preventDefault();
            const actuel = await utilisateurConnecte();
            if (!actuel) return alert("Tu dois être connecté pour publier un cours.");

            const matiere = formulaire.elements.matiere.value.trim();
            const titre = formulaire.elements.titre.value.trim();
            const contenu = formulaire.elements.contenu.value.trim();
            const fichiers = Array.from(imageInput.files || []);

            if (!matiere || !titre) return alert("Remplis la matière et le titre.");
            if (!contenu && !fichiers.length) return alert("Ajoute soit le texte du cours, soit au moins une photo.");

            if (contenu) {
                const moderation = analyserContenu(matiere + " " + titre + " " + contenu);
                if (!moderation.autorise) return alert("Publication refusée : ce contenu contient un terme interdit.");
            }

            if (fichiers.some(f => !f.type.startsWith("image/") || f.size > 10 * 1024 * 1024)) {
                return alert("Chaque photo doit être une image de 10 Mo maximum.");
            }

            const bouton = formulaire.querySelector("button[type='submit']");
            bouton.disabled = true;
            const imagesEnvoyees = [];

            try {
                for (const fichier of fichiers) {
                    const chemin = nomFichier(fichier);
                    const {error: uploadError} = await supabaseClient.storage.from("cours").upload(chemin, fichier, {contentType:fichier.type, upsert:false});
                    if (uploadError) throw uploadError;
                    const {data: publicData} = supabaseClient.storage.from("cours").getPublicUrl(chemin);
                    imagesEnvoyees.push(publicData.publicUrl);
                }

                const profil = await obtenirProfil();
                const {error} = await supabaseClient.from("cours").insert({
                    titre,
                    matiere,
                    contenu: contenu || null,
                    image_url: imagesEnvoyees.length ? stockerImages(imagesEnvoyees) : null,
                    auteur_id: actuel.id,
                    auteur_identifiant: profil?.identifiant || "Utilisateur"
                });

                if (error) throw error;

                formulaire.reset();
                apercu.hidden = true;
                apercu.innerHTML = "";
                await chargerCours();
            } catch (error) {
                if (imagesEnvoyees.length) {
                    const chemins = imagesEnvoyees.map(url => {
                        const match = String(url).match(/\/storage\/v1\/object\/public\/cours\/(.+)$/);
                        return match ? decodeURIComponent(match[1]) : null;
                    }).filter(Boolean);
                    if (chemins.length) await supabaseClient.storage.from("cours").remove(chemins);
                }
                console.error(error);
                alert("Impossible de publier le cours : " + (error?.message || "erreur inconnue"));
            } finally {
                bouton.disabled = false;
            }
        });
    } catch (error) {
        console.error(error);
    }

    await chargerCours();
});