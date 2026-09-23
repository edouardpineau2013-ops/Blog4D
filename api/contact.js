export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée." });
    }

    try {
        const { nom, email, message, website } = req.body || {};

        if (website) {
            return res.status(200).json({ success: true });
        }

        const nomNettoye = nom?.trim() || "";
        const emailNettoye = email?.trim() || "";
        const messageNettoye = message?.trim() || "";

        if (!nomNettoye || !messageNettoye) {
            return res.status(400).json({ error: "Le nom et le message sont obligatoires." });
        }

        const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailNettoye && !emailValide.test(emailNettoye)) {
            return res.status(400).json({ error: "Adresse e-mail invalide." });
        }

        if (nomNettoye.length > 100 || emailNettoye.length > 254 || messageNettoye.length > 5000) {
            return res.status(400).json({ error: "Un des champs est trop long." });
        }

        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.error("RESEND_API_KEY est absente de l'environnement Vercel.");
            return res.status(500).json({ error: "Le service d'envoi n'est pas encore configuré." });
        }

        const emailData = {
            from: "Blog 4D <onboarding@resend.dev>",
            to: ["edouard.pineau.2013@gmail.com"],
            subject: `Nouveau message du Blog 4D — ${nomNettoye}`,
            text: `Nom : ${nomNettoye}\nE-mail : ${emailNettoye || "Non renseigné"}\n\nMessage :\n${messageNettoye}`
        };

        if (emailNettoye) {
            emailData.reply_to = emailNettoye;
        }

        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(emailData)
        });

        const result = await response.json().catch(() => ({}));

        console.log("Réponse Resend :", {
            status: response.status,
            ok: response.ok,
            result
        });

        if (!response.ok) {
            const detail = result?.message || result?.name || "Réponse invalide de Resend.";
            return res.status(502).json({
                error: `Resend a refusé l'envoi : ${detail}`
            });
        }

        if (!result?.id) {
            console.error("Resend a répondu sans identifiant d'e-mail :", result);
            return res.status(502).json({
                error: "Resend n'a pas confirmé l'envoi du message."
            });
        }

        console.log("E-mail Resend créé :", result.id);

        return res.status(200).json({
            success: true,
            emailId: result.id
        });
    } catch (error) {
        console.error("Erreur API contact :", error);
        return res.status(500).json({ error: "Une erreur est survenue lors de l'envoi." });
    }
}
