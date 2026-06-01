const https = require('https');
const fs = require('fs');
const path = require('path');

const screens = [
    { name: 'stitch_registro.html', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2NmMDMxNDdkZjIyYTQwMmU4NWRkZDViNzgyZWRkYTI0EgsSBxDw-8PavR8YAZIBJAoKcHJvamVjdF9pZBIWQhQxNzI3MzMzOTUxNTk2MjMxNDE1NQ&filename=&opi=89354086' },
    { name: 'stitch_login.html', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2NiNmRhYTE2N2VjNzQ5YzRiYzcyMDg5NjZiNTRhZDJlEgsSBxDw-8PavR8YAZIBJAoKcHJvamVjdF9pZBIWQhQxNzI3MzMzOTUxNTk2MjMxNDE1NQ&filename=&opi=89354086' },
    { name: 'stitch_movimientos.html', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzE4Y2RhODVhZTI1OTQ2M2JhYTQ4ZWI4ZmQ0NDAwMTU1EgsSBxDw-8PavR8YAZIBJAoKcHJvamVjdF9pZBIWQhQxNzI3MzMzOTUxNTk2MjMxNDE1NQ&filename=&opi=89354086' },
    { name: 'stitch_asesor.html', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2RkNTE0NTkzMGVkMTQ4ZjY5OGRkZDE0YzYwNWE4NzcyEgsSBxDw-8PavR8YAZIBJAoKcHJvamVjdF9pZBIWQhQxNzI3MzMzOTUxNTk2MjMxNDE1NQ&filename=&opi=89354086' },
    { name: 'stitch_ajustes.html', url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzE4ZGI3N2JjZjEzNzRkYmQ5NTM1MmYwNjU4YTkxYmQzEgsSBxDw-8PavR8YAZIBJAoKcHJvamVjdF9pZBIWQhQxNzI3MzMzOTUxNTk2MjMxNDE1NQ&filename=&opi=89354086' }
];

screens.forEach(screen => {
    https.get(screen.url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            fs.writeFileSync(path.join(__dirname, screen.name), data);
            console.log(`Downloaded ${screen.name}`);
        });
    });
});
