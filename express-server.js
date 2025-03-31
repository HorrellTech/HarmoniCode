const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const app = express();

// Serve static files from the project root directory
app.use(express.static(__dirname));

// Serve index.html at the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve samples directory for audio files
app.use('/samples', express.static(path.join(__dirname, 'samples')));

// API endpoint to get samples directory structure
app.get('/api/samples', async (req, res) => {
    try {
        const samplesDir = path.join(__dirname, 'samples');
        const structure = await getDirectoryStructure(samplesDir);
        res.json(structure);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Function to recursively get directory structure
async function getDirectoryStructure(dir) {
    try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        const structure = [];

        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            const relativePath = '/' + path.relative(__dirname, fullPath).replace(/\\/g, '/');
            
            if (item.isDirectory()) {
                const children = await getDirectoryStructure(fullPath);
                structure.push({
                    type: 'directory',
                    name: item.name,
                    path: relativePath,
                    children
                });
                console.log(`Found directory: ${item.name} with ${children.length} items`);
            } else if (item.isFile() && /\.(wav|mp3)$/i.test(item.name)) {
                structure.push({
                    type: 'file',
                    name: item.name,
                    path: relativePath,
                    extension: path.extname(item.name).toLowerCase()
                });
                console.log(`Found audio file: ${item.name}`);
            }
        }

        return structure;
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
        throw error;
    }
}

// API endpoint to get samples directory structure
app.get('/api/samples', async (req, res) => {
    try {
        const samplesDir = path.join(__dirname, 'samples');
        console.log('Reading samples from:', samplesDir);

        
        // Ensure samples directory exists
        try {
            await fs.access(samplesDir);
            console.log('Samples directory exists');
        } catch (error) {
            console.log('Creating samples directory...');
            await fs.mkdir(samplesDir, { recursive: true });
        }
        
        const structure = await getDirectoryStructure(samplesDir);

        console.log('Found structure:', JSON.stringify(structure, null, 2));
        
        // Convert absolute paths to relative paths for client-side use
        const processStructure = (items) => {
            return items.map(item => {
                const relativePath = '/' + path.relative(__dirname, item.path).replace(/\\/g, '/');
                if (item.type === 'directory' && item.children) {
                    return {
                        ...item,
                        path: relativePath,
                        children: processStructure(item.children)
                    };
                }
                return {
                    ...item,
                    path: relativePath
                };
            });
        };
        
        const processedStructure = processStructure(structure);
        res.json(processedStructure);
    } catch (error) {
        console.error('Error reading samples:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Serving files from: ${__dirname}`);
});