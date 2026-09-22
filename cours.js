document.addEventListener("DOMContentLoaded", async () => {
    const liste = document.getElementById("liste-cours");
    const formulaire = document.getElementById("form-cours");
    const messageConnexion = document.getElementById("message-connexion-cours");
    const imageInput = document.getElementById("image");
    const apercu = document.getElementById("apercu-image");
    if (!liste) return;

    const echapperHTML = texte => String(texte ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[c]));
    const afficherDate = date => new Date(date).toLocaleString("fr-FR", {dateStyle:"long", timeStyle:"short"});
    const nomFichier = fichier => `cours/${crypto.randomUUID()}-${fichier.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

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
        liste.innerHTML = data.map(c => `
            <article class="course-card">
                <div class="article-top"><span class="article-tag">${echapperHTML(c.matiere)}</span><span class="article-date">${afficherDate(c.created_at)}</span></div>
                <h3>${echapperHTML(c.titre)}</h3>
                ${c.contenu ? `<p class="course-content">${echapperHTML(c.contenu).replace(/\n/g,"<br>")}</p>` : ""}
                ${c.image_url ? `<a class="course-image-link" href="${echapperHTML(c.image_url)}" target="_blank" rel="noopener"><img class="course-image" src="${echapperHTML(c.image_url)}" alt="Photo du cours : ${echapperHTML(c.titre)}" loading="lazy"></a>` : ""}
                <div class="post-author">Publié par <strong>${echapperHTML(c.auteur_identifiant || "Utilisateur")}</strong>${c.updated_at ? ` · modifié le ${afficherDate(c.updated_at)}` : ""}</div>
                ${admin ? `<div class="admin-actions"><button type="button" class="danger-button admin-delete" data-id="${c.id}" data-image="${echapperHTML(c.image_url || "")}">Supprimer</button></div>` : ""}
            </article>`).join("");

        if (!admin) return;
        liste.querySelectorAll(".admin-delete").forEach(button => button.addEventListener("click", async () => {
            if (!confirm("Supprimer définitivement ce cours ?")) return;
            button.disabled = true;
            const id = button.dataset.id;
            const imageUrl = button.dataset.image;
            const {data: deleted, error} = await supabaseClient.from("cours").delete().eq("id", id).select("id");
            if (error) {
                button.disabled = false;
                alert("Suppression impossible : " + error.message);
                return;
            }
            if (imageUrl) {
                const match = imageUrl.match(/\/storage\/v1\/object\/public\/cours\/(.+)$/);
                if (match) await supabaseClient.storage.from("cours").remove([decodeURIComponent(match[1])]);
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
        const fichier = imageInput.files?.[0];
        if (!fichier) {
            apercu.hidden = true;
            apercu.innerHTML = "";
            return;
        }
        if (fichier.size > 10 * 1024 * 1024) {
            imageInput.value = "";
            apercu.hidden = true;
            return alert("La photo ne doit pas dépasser 10 Mo.");
        }
        const url = URL.createObjectURL(fichier);
        apercu.innerHTML = `<img class="course-image" src="${url}" alt="Aperçu de la photo du cours">`;
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
            const fichier = imageInput.files?.[0] || null;
            if (!matiere || !titre) return alert("Remplis la matière et le titre.");
            if (!contenu && !fichier) return alert("Ajoute soit le texte du cours, soit une photo.");
            if (contenu) {
                const moderation = analyserContenu(matiere + " " + titre + " " + contenu);
                if (!moderation.autorise) return alert("Publication refusée : ce contenu contient un terme interdit.");
            }
            if (fichier && (!fichier.type.startsWith("image/") || fichier.size > 10 * 1024 * 1024)) return alert("Photo invalide : image de 10 Mo maximum.");
            const bouton = formulaire.querySelector("button[type='submit']");
            bouton.disabled = true;
            let imageUrl = null;
            if (fichier) {
                const chemin = nomFichier(fichier);
                const {error: uploadError} = await supabaseClient.storage.from("cours").upload(chemin, fichier, {contentType:fichier.type, upsert:false});
                if (uploadError) {
                    bouton.disabled = false;
                    console.error(uploadError);
                    return alert("Impossible d'envoyer la photo : " + uploadError.message);
                }
                const {data: publicData} = supabaseClient.storage.from("cours").getPublicUrl(chemin);
                imageUrl = publicData.publicUrl;
            }
            const profil = await obtenirProfil();
            const {error} = await supabaseClient.from("cours").insert({titre, matiere, contenu:contenu || null, image_url:imageUrl, auteur_id:actuel.id, auteur_identifiant:profil?.identifiant || "Utilisateur"});
            if (error) {
                if (fichier) await supabaseClient.storage.from("cours").remove([imageUrl.split("/storage/v1/object/public/cours/")[1]]);
                bouton.disabled = false;
                return alert("Impossible de publier le cours : " + error.message);
            }
            formulaire.reset();
            apercu.hidden = true;
            apercu.innerHTML = "";
            bouton.disabled = false;
            await chargerCours();
        });
    } catch (error) { console.error(error); }
    await chargerCours();
});