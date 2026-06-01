const { getDatabase } = require('../backend/db/database');

try {
    const db = getDatabase();
    
    console.log("=== USUARIOS ===");
    const users = db.prepare("SELECT * FROM users").all();
    console.log(users);
    
    console.log("\n=== CATEGORÍAS ===");
    const categories = db.prepare("SELECT * FROM categories").all();
    console.log(categories);
    
    console.log("\n=== TRANSACCIONES ===");
    const txs = db.prepare("SELECT * FROM transactions").all();
    console.log(txs);
    
    console.log("\n=== TOTALES GRUPADOS POR TIPO (ESTE MES) ===");
    const date = new Date();
    const currentMonth = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 7);
    console.log("Mes Actual Calculado:", currentMonth);
    
    const totals = db.prepare(`
        SELECT type, SUM(amount) as total, COUNT(*) as count
        FROM transactions 
        WHERE strftime('%Y-%m', date) = ?
        GROUP BY type
    `).all(currentMonth);
    console.log(totals);

} catch (error) {
    console.error("Error en diagnóstico:", error);
}
