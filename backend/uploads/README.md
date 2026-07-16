# Uploaded media lives here (local storage driver).
#
# The Storage Platform writes files under this directory and Express serves
# them at STORAGE_PUBLIC_BASE_URL (/static/<key>).
#
# The FOLDER STRUCTURE is committed; the uploaded files themselves are not
# (see .gitignore) — they are runtime data, not source.
#
# Deployment: point STORAGE_LOCAL_DIR at the server's upload volume
# (e.g. /var/www/uploads) and serve it with nginx at the same /static path,
# or switch STORAGE_DRIVER to s3/cloudinary. No application code changes.
