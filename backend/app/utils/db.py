import mysql.connector
from mysql.connector import Error
from contextlib import contextmanager

# MySQL 데이터베이스 설정
db_config = {
    "host": "localhost",
    "user": "team_user",
    "password": "1234",
    "database": "mini_db",
    "port": 3306
}


def get_connection():
    """
    MySQL 데이터베이스 연결을 생성하고 반환합니다.
    """
    try:
        connection = mysql.connector.connect(**db_config)
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"MySQL 연결 오류: {e}")
        raise e


@contextmanager
def get_db_connection():
    """
    컨텍스트 매니저를 사용한 데이터베이스 연결.
    with 문과 함께 사용하면 자동으로 연결이 닫힙니다.
    
    사용 예시:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM table_name")
            results = cursor.fetchall()
    """
    connection = None
    try:
        connection = get_connection()
        yield connection
    finally:
        if connection and connection.is_connected():
            connection.close()


@contextmanager
def get_db_cursor(dictionary=False):
    """
    컨텍스트 매니저를 사용한 데이터베이스 커서.
    자동으로 커밋하고 연결을 닫습니다.
    
    Args:
        dictionary: True면 결과를 딕셔너리 형태로 반환
    
    사용 예시:
        with get_db_cursor(dictionary=True) as cursor:
            cursor.execute("SELECT * FROM table_name")
            results = cursor.fetchall()
    """
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=dictionary)
        yield cursor
        connection.commit()
    except Error as e:
        if connection:
            connection.rollback()
        raise e
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


def test_connection():
    """
    데이터베이스 연결을 테스트합니다.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"MySQL 연결 성공! 버전: {version[0]}")
            cursor.close()
            return True
    except Error as e:
        print(f"MySQL 연결 실패: {e}")
        return False


if __name__ == "__main__":
    test_connection()