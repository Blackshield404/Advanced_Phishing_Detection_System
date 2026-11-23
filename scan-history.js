
import { supabase } from "./supabase-client.js";

async function saveScan(data) {
    try {
        const { data: userData, error: userError } =
            await supabase.auth.getUser();

        if (userError) throw userError;

        const user = userData.user;

        if (!user) {
            console.info("Sign in to save scan history.");
            return;
        }

        const { error } = await supabase
            .from("scan_history")
            .insert({
                user_id: user.id,
                url: data.url || "",
                risk_score: Math.round(data.risk?.score ?? 0),
                risk_level: data.risk?.level || "UNKNOWN",
                prediction: data.machine_learning?.prediction || null,
                scan_result: data
            });

        if (error) throw error;

        console.log("Scan saved to Supabase history.");
        window.dispatchEvent(
            new Event("phishkavach:history-updated")
        );

    } catch (error) {
        console.error("Could not save scan:", error.message);
    }
}

window.addEventListener(
    "phishkavach:scan-complete",
    event => saveScan(event.detail)
);