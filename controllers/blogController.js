const Blog = require("../models/Blog");
const cloudinary = require("../utils/cloudinary");


// Upload image to Cloudinary
const uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "khan-moves/blogs",
                resource_type: "image",
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        uploadStream.end(fileBuffer);
    });
};


// Delete image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
    if (!publicId) return;

    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error("Cloudinary delete error:", error);
    }
};


// ===============================
// ADD BLOG
// ===============================
exports.addBlog = async (req, res) => {
    try {
        const { title, blogText } = req.body;

        if (!title || !blogText) {
            return res.status(400).json({
                success: false,
                message: "Title and blog text are required",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Blog image is required",
            });
        }

        // Upload image
        const uploadedImage = await uploadToCloudinary(req.file.buffer);

        // Save blog
        const blog = await Blog.create({
            title,
            blogText,
            image: {
                url: uploadedImage.secure_url,
                public_id: uploadedImage.public_id,
            },
        });

        res.status(201).json({
            success: true,
            message: "Blog added successfully",
            blog,
        });

    } catch (error) {
        console.error("Add blog error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to add blog",
            error: error.message,
        });
    }
};


// ===============================
// GET ALL BLOGS
// ===============================
exports.getBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find()
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: blogs.length,
            blogs,
        });

    } catch (error) {
        console.error("Get blogs error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch blogs",
            error: error.message,
        });
    }
};


// ===============================
// GET SINGLE BLOG
// ===============================
exports.getBlogById = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }

        res.status(200).json({
            success: true,
            blog,
        });

    } catch (error) {
        console.error("Get blog error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch blog",
            error: error.message,
        });
    }
};


// ===============================
// UPDATE BLOG
// ===============================
exports.updateBlog = async (req, res) => {
    try {
        const { title, blogText } = req.body;

        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }

        // Update text fields
        if (title !== undefined) {
            blog.title = title;
        }

        if (blogText !== undefined) {
            blog.blogText = blogText;
        }


        // If new image uploaded
        if (req.file) {

            // Upload new image
            const uploadedImage = await uploadToCloudinary(req.file.buffer);

            // Delete old image
            await deleteFromCloudinary(blog.image.public_id);

            // Save new image
            blog.image = {
                url: uploadedImage.secure_url,
                public_id: uploadedImage.public_id,
            };
        }


        await blog.save();

        res.status(200).json({
            success: true,
            message: "Blog updated successfully",
            blog,
        });

    } catch (error) {
        console.error("Update blog error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update blog",
            error: error.message,
        });
    }
};


// ===============================
// DELETE BLOG
// ===============================
exports.deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }

        // Delete image from Cloudinary
        await deleteFromCloudinary(blog.image.public_id);

        // Delete blog from MongoDB
        await Blog.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Blog deleted successfully",
        });

    } catch (error) {
        console.error("Delete blog error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete blog",
            error: error.message,
        });
    }
};