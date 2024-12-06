from flask import redirect, request, session, jsonify
from flask_app import app
from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.models.client_model import Client
from flask_app.models.products_model import Product
from flask_app.models.purchases_model import Purchase
import boto3
import os
from werkzeug.utils import secure_filename
import traceback



s3_client = boto3.client(
    's3',
    aws_access_key_id=app.config['AWS_ACCESS_KEY_ID'],
    aws_secret_access_key=app.config['AWS_SECRET_ACCESS_KEY'],
    region_name=app.config['S3_REGION']
)

def upload_to_s3(file, bucket_name):
    print("In upload_to_s3")
    print("file:", file)
    print("type(file):", type(file))
    print("dir(file):", dir(file))  # Lists all attributes and methods of file
    try:
            filename = secure_filename(getattr(file, 'filename', 'default_filename'))
            content_type = getattr(file, 'content_type', 'application/octet-stream')

            s3_client.upload_fileobj(
                file,
                bucket_name,
                filename,
                ExtraArgs={
                    "ContentType": content_type,
                    "ACL": "public-read"  # Make the file publicly readable
                }
            )
            # Construct the URL based on your bucket's region
            region = app.config['S3_REGION']
            url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{filename}"
            return url
    except Exception as e:
            print(f"Something went wrong: {e}")
            traceback.print_exc()
            return None



# CREATE Product
@app.route('/api/create_product', methods=['POST'])
def create_product():
    # Extract data from form
    product_name = request.form.get('name')
    description = request.form.get('description')
    price = request.form.get('price')
    screenshot_photo = request.files.get('screenshot_photo')

    # Ensure a file is uploaded
    if not screenshot_photo:
        return jsonify({"error": "Screenshot photo is required"}), 400

    # Upload the image to S3 and get URL
    image_url = upload_to_s3(screenshot_photo, app.config['S3_BUCKET_NAME'])

    # Check for duplicate screenshot photo
    if Product.is_duplicate_screenshot(image_url):
        return jsonify({"error": "Product photo already exists"}), 400

    # Proceed to save the product
    product_data = {
        'name': product_name,
        'description': description,
        'price': price,
        'screenshot_photo': image_url
    }
    try:
        product_id = Product.save(product_data)
        return jsonify({"message": "Product created!", "product_id": product_id}), 201
    except Exception as e:
        print(f"Error saving product: {e}")
        traceback.print_exc()
        return jsonify({"error": "Failed to save product"}), 500







# READ All Products
@app.route('/api/get_all_products/page/<int:page>', methods=['GET'])
def get_all_products(page):
    search = request.args.get('search', None)
    products, total_count = Product.get_all(page, search)
    response = {
        'products': [product.serialize() for product in products],
        'total_count': total_count
    }
    return jsonify(response), 200



# READ Single Product by ID
@app.route('/api/get_product/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.get_by_id(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(product.serialize()), 200


# UPDATE Product
@app.route('/api/update_product/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    # Fetch existing product details from the database
    product = Product.get_by_id(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    # Extract updated data from form
    product_name = request.form.get('name')
    description = request.form.get('description')
    price = request.form.get('price')
    screenshot_photo = request.files.get('screenshot_photo')

    # Check if a new image file is uploaded
    if screenshot_photo:
        # Upload the new image to S3 and get URL
        image_url = upload_to_s3(screenshot_photo, app.config['S3_BUCKET_NAME'])
        if not image_url:
            return jsonify({"error": "Failed to upload new image"}), 500

        # Check for duplicate screenshot photo
        if Product.is_duplicate_screenshot(image_url) and image_url != product.screenshot_photo:
            return jsonify({"error": "Product photo already exists"}), 400
    else:
        # Keep the existing image URL if no new image is uploaded
        image_url = product.screenshot_photo

    # Prepare updated product data
    updated_data = {
        'id': product_id,
        'name': product_name,
        'description': description,
        'price': price,
        'screenshot_photo': image_url
    }

    # Update product in the database
    try:
        Product.update(updated_data)
        return jsonify({"message": "Product updated successfully"}), 200
    except Exception as e:
        print(f"Error updating product: {e}")
        traceback.print_exc()
        return jsonify({"error": "Failed to update product"}), 500




# DELETE Product
@app.route('/api/delete_product/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    print(f"Received DELETE request for product ID {product_id}")
    try:
        
        success = Product.delete(product_id)  
        if success:
            print(f"Successfully deleted product {product_id}")
            return jsonify({"success": True}), 200
        else:
            print(f"No product found with ID {product_id}")
            return jsonify({"success": False, "message": "Product not found"}), 404
    except Exception as e:
        print(f"Exception during delete: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


# SEARCH Products by Name
@app.route('/api/search_products', methods=['GET'])
def search_products():
    try:
        name = request.args.get('name', '')
        products = Product.search_by_name(name)
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# GET Products with Sizes
@app.route('/api/get_products_with_sizes', methods=['GET'])
def get_products_with_sizes():
    try:
        products_with_sizes = Product.get_products_with_sizes()
        return jsonify(products_with_sizes), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve products with sizes"}), 500



# FILTER Products by Price Range
@app.route('/api/filter_products_by_price', methods=['GET'])
def filter_products_by_price():
    min_price = request.args.get('min_price')
    max_price = request.args.get('max_price')
    
    if not min_price or not max_price:
        return jsonify({"error": "Both min_price and max_price are required"}), 400

    products = Product.filter_by_price_range(float(min_price), float(max_price))
    return jsonify([product.serialize() for product in products]), 200


@app.route('/api/get_clients_for_product/<int:product_id>', methods=['GET'])
def get_clients_for_product(product_id):
    try:
        clients = Purchase.get_clients_for_product(product_id)
        return jsonify(clients)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    


