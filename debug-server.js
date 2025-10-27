console.log('Starting server test...');

try {
    const express = require('express');
    console.log('✅ Express loaded');
    
    const app = express();
    const PORT = 3000;
    
    app.get('/', (req, res) => {
        res.send('Server is working!');
    });
    
    app.listen(PORT, () => {
        console.log('✅ Server started successfully!');
        console.log('🌐 Open: http://localhost:' + PORT);
        console.log('Press Ctrl+C to stop');
    });
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
}