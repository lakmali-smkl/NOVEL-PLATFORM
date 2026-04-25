const Article = require('../models/Article'); // Import the model

// Example: Get all articles
router.get('/articles', async (req, res) => {
    try {
        const articles = await Article.find(); // Use the model here
        res.json(articles);
    } catch (err) {
        res.status(500).send(err);
    }
});