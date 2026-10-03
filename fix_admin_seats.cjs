const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPortalModal.tsx', 'utf8');

if (!content.includes('const [newTaskSeats')) {
    content = content.replace(
        "const [newTaskUrl, setNewTaskUrl] = useState('');",
        "const [newTaskUrl, setNewTaskUrl] = useState('');\n  const [newTaskSeats, setNewTaskSeats] = useState('1000');"
    );
}

if (!content.includes('setNewTaskSeats(\'1000\');')) {
    content = content.replace(
        "setNewTaskUrl('');",
        "setNewTaskUrl('');\n      setNewTaskSeats('1000');"
    );
}

content = content.replace(
    "category: 'telegram',",
    "category: 'telegram',\n      totalSeats: Number(newTaskSeats) || undefined,"
);

fs.writeFileSync('src/components/AdminPortalModal.tsx', content);
