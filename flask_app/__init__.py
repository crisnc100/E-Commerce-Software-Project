from flask import Flask
from flask_cors import CORS  
from flask_mail import Mail
from datetime import timedelta
import os
#from flask_wtf import CSRFProtect
from dotenv import load_dotenv
load_dotenv()
# Initialize Flask app
app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost", "http://127.0.0.1", "file://", "https://mariaortegas-project.onrender.com"])


app.secret_key = os.getenv('SECRET_KEY')


app.config['MAIL_SERVER'] = 'smtp.gmail.com'  # Correct SMTP server for Gmail
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'noreplyecommercesystems@gmail.com'  # My Gmail address
app.config['MAIL_PASSWORD'] = 'dumx fmpo gcfp melw '  # My app-specific password
app.config['MAIL_DEFAULT_SENDER'] = 'noreplyecommercesystems@gmail.com'  # My Gmail address
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_COOKIE_NAME'] = 'admin_user_session'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=60)  # Adjust the time as needed
app.config['SESSION_COOKIE_SECURE'] = False  # Use this if you're using HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent JavaScript access
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # Control cross-site behavior
app.config['AWS_ACCESS_KEY_ID'] = os.getenv('AWS_ACCESS_KEY_ID')
app.config['AWS_SECRET_ACCESS_KEY'] = os.getenv('AWS_SECRET_ACCESS_KEY')
app.config['S3_BUCKET_NAME'] = os.getenv('S3_BUCKET_NAME')
app.config['S3_REGION'] = os.getenv('S3_REGION')



# Initialize Flask-Mail with the app configuration
mail = Mail(app)
