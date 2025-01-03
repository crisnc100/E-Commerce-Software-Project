# a cursor is the object we use to interact with the database
import pymysql.cursors
import os
print(os.getenv('DB_HOST'))

# this class will give us an instance of a connection to our database
class MySQLConnection:
    def __init__(self, db):
        # change the user and password as needed
        try:
            connection = pymysql.connect(
                host='ecommerce-software-schema.cbgiuec4433k.us-east-1.rds.amazonaws.com',
                user='admin',
                password='s1mubqlN4ZIBSSLVD7Fz',
                database='maria_ortegas_project_schema',
                port=3306,
                charset='utf8mb4',
                cursorclass=pymysql.cursors.DictCursor,
                autocommit=False
            )
            self.connection = connection
        except pymysql.err.OperationalError as e:
            print(f"Error connecting to the database: {e}")
            raise
    # the method to query the database
    def query_db(self, query: str, data: dict = None):
        with self.connection.cursor() as cursor:
            try:
                cursor.execute(query, data)
                if query.strip().lower().startswith("insert"):
                    self.connection.commit()
                    return cursor.lastrowid
                elif query.strip().lower().startswith("select"):
                    result = cursor.fetchall()
                    return result
                else:
                    self.connection.commit()
                    return cursor.rowcount  # Return number of affected rows
            except Exception as e:
                print("Something went wrong:", e)
                import traceback
                traceback.print_exc()
                return False
            finally:
                self.connection.close()
# connectToMySQL receives the database we're using and uses it to create an instance of MySQLConnection
def connectToMySQL(db):
    return MySQLConnection(db)