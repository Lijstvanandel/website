const fs = require('fs');
const dbPath = './db.json';
if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const user = db.users.find(u => u.username === 'Lisa123');
  if (user) {
    user.role = 'admin';
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('Succes: Rol van Lisa123 is gewijzigd naar admin.');
  } else {
    console.log('Fout: Gebruiker Lisa123 niet gevonden in db.json.');
  }
} else {
  console.log('Fout: db.json bestaat (nog) niet.');
}
