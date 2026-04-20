const sqlite3 = require('sqlite3');

const db = new sqlite3.Database('money_manager.db');

const runQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const test = async () => {
    console.log("--- Starting Unit Test ---");

    try {
        // 1. Check Schema Version
        const version = await runQuery("PRAGMA user_version");
        console.log("DB Version:", version[0].user_version);

        // 2. Check Services
        const services = await runQuery("SELECT * FROM services");
        console.log("Total Services:", services.length);

        // 3. Check Contracts and Services
        const contractServices = await runQuery("SELECT * FROM contract_services");
        console.log("Total Contract-Service Mappings:", contractServices.length);

        // 4. Test Last 6 Months Stats Query Logic
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = d.getMonth() + 1;
            const y = d.getFullYear();
            const prefix = `${y}-${String(m).padStart(2, '0')}`;
            const stats = await runQuery(`SELECT type, SUM(amount) as total FROM transactions WHERE date LIKE ? GROUP BY type`, [`${prefix}%`]);
            console.log(`Stats for ${prefix}:`, stats);
        }

        // 5. Check if room 5, 6, 8 have wifi
        const wifiSvc = services.find(s => s.name.toLowerCase().includes('wifi'));
        if (wifiSvc) {
            const wifiRooms = await runQuery(`
                SELECT c.room_id 
                FROM contract_services cs 
                JOIN contracts c ON cs.contract_id = c.id 
                WHERE cs.service_id = ?`, [wifiSvc.id]);
            console.log("Rooms with Wifi (IDs):", wifiRooms.map(r => r.room_id));
        }

        console.log("--- Unit Test Finished ---");
    } catch (e) {
        console.error("--- Unit Test Error ---");
        console.error(e);
    } finally {
        db.close();
    }
};

test();
