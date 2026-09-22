export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée." });
    }

    try {
        const { nom, email, message, website } = req.body || {};

        if (website) {
            return res.status(200).json({ success: true });
        }

        if (!nom?.trim() || !email?.trim() || !message?.trim()) {
            return res.status(400).json({ error: "Tous les champs sont obligatoires." });
        }

        const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailValide.test(email.trim())) {
            return res.status(400).json({ error: "Adresse e-mail invalide." });
        }

        if (nom.trim().length > 100 || email.trim().length > 254 || message.trim().length > 5000) {
            return res.status(400).json({ error: "Un des champs est trop long." });
        }

        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "Le service d'envoi n'est pas encore configuré." });
        }

        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: "Blog 4D <onboarding@resend.dev>",
                to: ["edouard.pineau.2013@gmail.com"],
                reply_to: email.trim(),
                subject: `Nouveau message du Blog 4D — ${nom.trim()}`,
                text: `Nom : ${nom.trim()}\nE-mail : ${email.trim()}\n\nMessage :\n${message.trim()}`
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Erreur Resend :", result);
            return res.status(502).json({ error: "Le message n'a pas pu être envoyé." });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Erreur API contact :", error);
        return res.status(500).json({ error: "Une erreur est survenue lors de l'envoi." });
    }
}
