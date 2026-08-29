const express = require("express");

const upload = require("../middleware/upload");

const {
    addBlog,
    getBlogs,
    getBlogById,
    updateBlog,
    deleteBlog,
} = require("../controllers/blogController");

const router = express.Router();


// Add Blog
router.post(
    "/add",
    upload.single("image"),
    addBlog
);


// Get All Blogs
router.get(
    "/all",
    getBlogs
);


// Get Single Blog
router.get(
    "/:id",
    getBlogById
);


// Update Blog
router.put(
    "/:id",
    upload.single("image"),
    updateBlog
);


// Delete Blog
router.delete(
    "/:id",
    deleteBlog
);


module.exports = router;