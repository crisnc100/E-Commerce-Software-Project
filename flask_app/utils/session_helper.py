from flask import session

class SessionHelper:
    @staticmethod
    def get_system_id():
        """Retrieve the system_id from session and validate its existence."""
        if 'system_id' not in session:
            raise ValueError("Unauthorized access: system_id is missing in session.")
        return session['system_id']

    @staticmethod
    def set_system_id(system_id):
        """Set the system_id in session."""
        session['system_id'] = system_id

    @staticmethod
    def clear_system_id():
        """Clear system_id from the session."""
        if 'system_id' in session:
            session.pop('system_id')
