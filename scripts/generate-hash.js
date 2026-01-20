const bcrypt = require('bcryptjs');

const password = 'admin@admin.ru';
const saltRounds = 10;

console.log('Generating hash for password:', password);

const hash = bcrypt.hashSync(password, saltRounds);

console.log('\nCopy this hash for SQL query:');
console.log(hash);
