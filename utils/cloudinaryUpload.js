const cloudinary = require("./cloudinary");
const streamifier = require("streamifier");

const uploadToCloudinary = (file, folder = "khan-moves/services") => {

    return new Promise((resolve, reject) => {

        if (!file) {
            return resolve(null);
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image"
            },
            (error, result) => {

                if (error) {
                    return reject(error);
                }

                resolve({
                    url: result.secure_url,
                    public_id: result.public_id
                });

            }
        );

        streamifier
            .createReadStream(file.buffer)
            .pipe(uploadStream);

    });

};

module.exports = uploadToCloudinary;