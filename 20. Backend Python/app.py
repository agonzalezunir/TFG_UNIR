import os
import pyodbc
from fastapi import FastAPI, Header, HTTPException, Depends, Query, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
import requests
import json
import uvicorn
from openai import OpenAI

app = FastAPI()

# Variables y tipos #########################################################################################

conn_str = "Driver={MySQL ODBC 9.6 Unicode Driver}; Server=localhost; Database=damadq; Uid=damadq; Pwd=temporal; Port:3306"

origins = [
    "http://localhost:4200",   # Angular en local
    "https://localhost:4200",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    user: str
    password: str

class UserUpdate(BaseModel):
    username: str
    name: str
    profileid: int
    password: str

class RuleUpdate(BaseModel):
    rulename: str
    categoryid: int
    typeid: int
    ruletext: str


class UserStatusChange(BaseModel):
    userstatusid: int

class ConnectionUpdate(BaseModel):
    connectionname: str
    server: str
    port: int
    database: str
    user: str
    password: str

class prompt(BaseModel):
    userprompt: str


# Mundo SQL, conexión y demás #########################################################################################
def get_conn(connstr):
    #Realiza la conexión a SQL con un reintento
    try:
        conn = pyodbc.connect(connstr)
        return conn
    except pyodbc.OperationalError as e:
        print("Error al conectar, reintentando:", e)
        # reintento simple
        conn = pyodbc.connect(connstr)
        return conn

def run_execute(query, params=None, connstr=conn_str):
    #Ejecuta una query de actualización
  try:
    conn = get_conn(connstr)
    cursor = conn.cursor()
    cursor.execute(query, params or ())
    conn.commit()
    return cursor.rowcount  # filas afectadas
  finally:
    cursor.close()
    conn.close()

def run_query(query, params=None, connstr=conn_str):
    # Ejecuta una query de consulta
    try:
        conn = get_conn(connstr)
        cursor = conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        result = cursor.fetchall()
        cursor.close()
        conn.close()
        return result
    except pyodbc.OperationalError:
        # Intenta reconectar
        conn = get_conn(connstr)
        cursor = conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        result = cursor.fetchall()
        cursor.close()
        conn.close()
        return result

# Autorización, login y seguridad/perfil ###############################################################################
def require_auth(authorization: str = Header(None)):
    #Gestiona que el usuario esté logado adecuadamente
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ", 1)[1].strip()

    rows = run_query(
        "SELECT userid, expires_at FROM f_session_token WHERE token=?",
        (token,),
    )
    if not rows:
        raise HTTPException(status_code=401, detail="Invalid token")

    expires_at = rows[0][1]
    now = datetime.utcnow()
    if expires_at < now:
        raise HTTPException(status_code=401, detail="Token expired")

    return {"user": rows[0][0]}


@app.post("/login")
def login(data: LoginRequest):
    #Realiza la validación del login del usuario
    query = "SELECT userid FROM d_user WHERE username=? AND password=? and userstatusid=1"
    result = run_query(query, (data.user, data.password))
    userid = result[0][0] if result else None
    if userid :
        token = secrets.token_urlsafe(48)
        query = "insert into f_session_token values (?,?,now())"
        result = run_execute (query, (userid, token))

        return {"status": "ok", "token":token}
    else:
        return {"status": "fail"}

@app.get("/me")
def me(auth=Depends(require_auth)):
    # Datos del usuario logado
    user = auth["user"]

    profile_rows = run_query(
        "SELECT userid, username, name, profile, userstatus, isadmin FROM v_user WHERE userid=? ",
        (user,),
    )
    if not profile_rows:
        raise HTTPException(status_code=404, detail="User not found")

    r = profile_rows[0]
    return {"userid":r[0], "username": r[1], "name": r[2], "profilename":r[3], "userstatus":r[4], "isadmin":r[5]}


@app.get("/me/nav")
def me_nav(auth=Depends(require_auth)):
    # Navegación del usuario logado
    user = auth["user"]

    nav_rows = run_query(
        "SELECT secitem, secitemid, route, icon FROM v_user_secitem WHERE userid=?",
        (user, ),
    )
    return [{"label": r[0], "id": r[1], "route": r[2], "icon":r[3]} for r in nav_rows]


@app.get("/appInfo")
def appInfo(auth=Depends(require_auth)):
    # Datos de la app

    text = run_query(
        "SELECT appname, appnotes, apptext FROM app_info",
        (),
    )
    return {"appname": text[0][0], "appnotes": text[0][1], "apptext":text[0][2]}

# Gestión de usuarios, perfiles y estados ###############################################################################
@app.get("/users")
def users(userstatusid: Optional[int]= Query(default=None), auth=Depends(require_auth)):
    # Listado de usuarios de la instancia

    print(userstatusid)
    if userstatusid is not None:
        text = run_query(
            "SELECT userid, username, name, profile, userstatus, profileid, userstatusid, password FROM v_user WHERE userstatusid=?",
            ( userstatusid),
        )
    else:
        text = run_query(
            "SELECT userid, username, name, profile, userstatus, profileid, userstatusid, password FROM v_user",
            (),
        )
    return [{"userid":r[0], "username": r[1], "name": r[2], "profilename":r[3], "userstatus":r[4],
             "profileid":r[5], "userstatusid":r[6], "password":r[7]} for r in text]

@app.put("/users")
def create_user(payload: UserUpdate, auth=Depends(require_auth)):
    # Crea un nuevo usuario

    # estado por defecto: ACTIVO
    DEFAULT_STATUSID = 1

    run_execute(
        "INSERT INTO d_user (username, password, name, profileid, userstatusid, updated) VALUES (?,?,?,?,?,now())",
        (payload.username, payload.password, payload.name, payload.profileid, DEFAULT_STATUSID),
    )

    new_id=run_query(
        "select userid from d_user where username=?",
        (payload.username,)
    )

    return {"userid": new_id[0][0]}

@app.get("/usersStatuses")
def userStatuses(auth=Depends(require_auth)):
    #Estados posibles de los usuarios

    text = run_query(
        "SELECT userstatusid, userstatus FROM d_user_status",
    )
    return [{"userstatusid":r[0], "userstatus": r[1]} for r in text]

@app.get("/profiles")
def profiles(auth=Depends(require_auth)):
    #Perfiles posibles de los usuarios

    text = run_query(
        "SELECT profileid, profile FROM d_user_profile order by 2",
        ()
    )
    return [{"profileid":r[0], "profilename": r[1]} for r in text]

@app.put("/users/{userid}")
def update_user(userid: int, payload: UserUpdate, auth=Depends(require_auth)):
    #Actualiza los datos de un usuario

    run_execute(
        "UPDATE d_user SET username=?, name=?, password=?, profileid=? WHERE userid=?",
        (payload.username, payload.name, payload.password, payload.profileid, userid),
    )

    return {"ok": True}

@app.put("/users/{userid}/status")
def set_user_status(userid: int, payload: UserStatusChange, auth=Depends(require_auth)):
    #Actualiza el estado de un usuario

    run_execute(
        "UPDATE d_user SET userstatusid=? WHERE userid=?",
        (payload.userstatusid,  userid),
    )

    return {"ok": True}

@app.get("/connections")
def connections(auth=Depends(require_auth)):
    #Conexiones existentes

    text = run_query(
        "SELECT connectionid, connectionname, server, `database`, port, user, password, status, updated FROM d_connections order by 2",
        ()
    )
    return [{"connectionid":r[0], "connectionname": r[1], "server":r[2],
             "database":r[3], "port":r[4], "user":r[5], "password":r[6],
             "status":r[7], "updated":r[8]} for r in text]

@app.put("/connections")
def create_conn(payload: ConnectionUpdate, auth=Depends(require_auth)):
    # Crea una nueva conexión

    run_execute(
        "INSERT INTO d_connections (server, `database`, user, password, port, connectionname, updated, status) VALUES (?,?,?,?,?, ?,now(), 'No validada')",
        (payload.server, payload.database, payload.user, payload.password, payload.port, payload.connectionname,),
    )

    new_id=run_query(
        "select connectionid from d_connections where connectionname=?",
        (payload.connectionname,)
    )

    return {"userid": new_id[0][0]}

@app.put("/connections/{connectionid}")
def update_conn(connectionid:int, payload: ConnectionUpdate, auth=Depends(require_auth)):
    # Actualiza los datos de una conexión

    run_execute(
        "update d_connections set server=?, `database`=?, user=?, password=?, port=?, connectionname=?, updated=now(), status='No validada' where connectionid=?",
        (payload.server, payload.database, payload.user, payload.password, payload.port, payload.connectionname,connectionid),
    )

    return {"ok": True}

@app.put("/connections/{connectionid}/delete")
def delete_conn(connectionid:int, auth=Depends(require_auth)):
    # Borra una conexión

    run_execute(
        "delete from d_connections where connectionid=?",
        (connectionid, ),
    )

    return {"ok": True}

@app.put("/connections/{connectionid}/status/{status}")
def update_conn_status(connectionid:int, status:str, auth=Depends(require_auth)):
    # Actualiza el estado de una conexión

    run_execute(
        "update d_connections set status=? where connectionid=?",
        (status, connectionid, ),
    )

    return {"ok": True}

@app.get("/connections/{connectionid}/test")
def test_conn(connectionid:int, auth=Depends(require_auth)):
    # Testea que la conexión es correcta

    result=run_query(
        "select connectionid, server, `database`, user, password, port from d_connections where connectionid=?",
        (connectionid,)
    )

    conn_str = "Driver={MySQL ODBC 9.6 Unicode Driver};"+f"Server={result[0][1]}; Database={result[0][2]}; Uid={result[0][3]}; Pwd={result[0][4]}; Port:{result[0][5]}"
    print (conn_str)

    try:
        conn = pyodbc.connect(conn_str)
        conn.close()
        run_execute(
            "update d_connections set status='Conexión validada' where connectionid=?",
            (connectionid,))
        return {"ok": True}
    except:
        run_execute(
            "update d_connections set status='Error de conexión' where connectionid=?",
            (connectionid,))
        return {"ok": False}

@app.get("/connections/{connectionid}/extract")
def extract_conn(connectionid:int, auth=Depends(require_auth)):
    # Extrae la metadata del esquema y la guarda en las tablas para tal efecto.

    try:
        result=run_query(
            "select connectionid, server, `database`, user, password, port from d_connections where connectionid=?",
            (connectionid,)
        )

        conn_str = "Driver={MySQL ODBC 9.6 Unicode Driver};"+f"Server={result[0][1]}; Database={result[0][2]}; Uid={result[0][3]}; Pwd={result[0][4]}; Port:{result[0][5]}"
        print (conn_str)

        # Borrado de tablas
        run_execute("delete from d_tables where schema_name=?", (result[0][2],))
        run_execute("delete from d_columns where schema_name=?", (result[0][2],))

        tables=run_query(
            "select table_schema, table_name from information_schema.tables where table_schema=?",
            (result[0][2], ),
                conn_str
        )
        # Insertar las tablas
        for t in tables:
            run_execute("insert into d_tables (schema_name, table_name, connection_id) values (?,?, ?)",
                        (t[0], t[1], connectionid),)

        columns = run_query(
            "select table_schema, table_name, column_name,column_key, is_nullable, data_type, character_maximum_length from information_schema.columns where table_schema=?",
            (result[0][2],),
            conn_str
        )
        # Insertar las tablas
        for c in columns:
            run_execute("insert into d_columns (schema_name, table_name, column_name,  column_key, column_isnullable, column_type, column_max, connection_id) values (?,?,?,?,?,?,?,?)",
                        (c[0], c[1], c[2], c[3], c[4], c[5],c[6],connectionid))

        run_execute(
                "update d_connections set status='Metadata extraída', updated=now() where connectionid=?",
                (connectionid,))
        return {"ok": True}
    except:
        run_execute(
            "update d_connections set status='Error de conexión' where connectionid=?",
            (connectionid,))
        return {"ok": False}

################### Gestión de tablas y campos #############################################################

@app.get("/tables")
def tables(connectionid: Optional[int]= Query(default=None), auth=Depends(require_auth)):
    #Devuelve la lista de grupos y sus características

    query = ("SELECT t.table_id, t.schema_name, t.table_name, t.medallion_id, d.medallion from d_tables t join d_medallion d on t.medallion_id=d.medallion_id")
    params = ( )

    if connectionid is not None:
        query += " where schema_name in (select `database` from d_connections where connectionid=?)"
        params = params + (connectionid,)

    tables = run_query(query, params)

    return [{"tableid":r[0], "schemaname": r[1], "tablename":r[2],"medallionid":r[3], "medallion":r[4]} for r in tables]

@app.get("/tables/{tableid}/columns")
def columns(tableid: int, auth=Depends(require_auth)):
    #Devuelve las tablas de una conexión

    table = run_query(
        "SELECT table_id, table_name from d_tables where table_id=?",
        (tableid, )
    )

    columns = run_query(
        "SELECT column_id, schema_name, table_name, column_name, column_isnullable, column_key, column_type, column_max from d_columns where table_name=?",
        (table[0][1], )
    )

    return [{"columnid":r[0], "schemaname": r[1], "tablename":r[2],"columnname":r[3],
             "columnnull":r[4], "columnkey":r[5], "columntype":r[6], "columnmax":r[7]} for r in columns]

@app.get("/medallions")
def medallions(auth=Depends(require_auth)):
    #Medallones existentes

    text = run_query(
        "SELECT medallion_id, medallion FROM d_medallion order by 1",
        ()
    )
    return [{"medallionid":r[0], "medallion": r[1]} for r in text]

@app.put("/tables/{tableid}/medallion/{medallionid}")
def assign_to_group(tableid: int, medallionid:int, auth=Depends(require_auth)):
    # Asigna un tipo de medallón a una tabla

    run_execute(
        "update d_tables set medallion_id=? where table_id=?",
        ( medallionid, tableid,),
    )

    return {"ok": True}

##### Gestión de reglas ################################################################################

@app.get("/rules")
def rules(categoryid: Optional[int]= Query(default=None), typeid: Optional[int]= Query(default=None), auth=Depends(require_auth)):
    # Listado de reglas
    sql = "select rule_id, rule_name, category_id, category, type_id, type, rule_text, rule_status, updated from v_rules where 1=1 "
    params = ()

    if categoryid is not None:
        sql += " and category_id=?"
        params = params + (categoryid,)

    if typeid is not None:
        sql +=" and type_id=?"
        params = params + (typeid,)

    result = run_query(sql, params)

    return [{"ruleid":r[0], "rulename": r[1], "categoryid": r[2], "category":r[3], "typeid":r[4],
             "type":r[5], "ruletext":r[6], "rulestatus":r[7], "updated":r[8]} for r in result]

@app.get("/categories")
def categories(auth=Depends(require_auth)):
    #Categorías existentes

    text = run_query(
        "SELECT category_id, category FROM d_category order by 1",
        ()
    )
    return [{"categoryid":r[0], "category": r[1]} for r in text]

@app.get("/types")
def types(auth=Depends(require_auth)):
    #Tipos de regla existentes

    text = run_query(
        "SELECT type_id, type FROM d_type order by 1",
        ()
    )
    return [{"typeid":r[0], "rtype": r[1]} for r in text]

@app.put("/rules")
def create_rule(payload: RuleUpdate, auth=Depends(require_auth)):
    # Crea una nueva regla

    run_execute(
        "INSERT INTO d_rules (rule_name, category_id, type_id, rule_text, rule_status, updated) VALUES (?,?,?, ?, 'No validada', now())",
        (payload.rulename, payload.categoryid, payload.typeid, payload.ruletext,),
    )

    new_id=run_query(
        "select rule_id from d_rules where rule_name=?",
        (payload.rulename,)
    )

    return {"ruleid": new_id[0][0]}

@app.put("/rules/{ruleid}")
def update_rule(ruleid:int, payload: RuleUpdate, auth=Depends(require_auth)):
    # Actualiza los datos de una regla

    run_execute(
        "update d_rules set rule_name=?, `category_id`=?, type_id=?, rule_text=?, rule_status='No validada', updated=now() where rule_id=?",
        (payload.rulename, payload.categoryid, payload.typeid, payload.ruletext, ruleid),
    )

    return {"ok": True}

@app.put("/rules/{ruleid}/delete")
def delete_rule(ruleid:int, auth=Depends(require_auth)):
    # borra una regla

    run_execute(
        "delete from d_rules where rule_id=?",
        (ruleid),
    )

    run_execute(
        "delete from f_exec_rules_columns where rule_id=?",
        (ruleid),
    )

    run_execute(
        "delete from f_exec_rules_tables where rule_id=?",
        (ruleid),
    )

    run_execute(
        "delete from f_exec_rules_columns_last where rule_id=?",
        (ruleid),
    )

    run_execute(
        "delete from f_exec_rules_tables_last where rule_id=?",
        (ruleid),
    )

    run_execute(
        "delete from rel_rules_columns where rule_id=?",
        (ruleid),
    )

    run_execute(
        "delete from rel_rules_tables where rule_id=?",
        (ruleid),
    )

    return {"ok": True}

def sustituir_tags(sql, mapeo):
    # Mapeo de sustituciones en el SQL
    for tag, valor in mapeo.items():
        sql = sql.replace(tag, str(valor))
    return sql

@app.put("/rules/{ruleid}/validate")
def columns(ruleid: int, auth=Depends(require_auth)):
    #Testea la sintaxis de una validación contra la tabla de referencia (a nivel de una tabla y campo)

    rule = run_query(
        "SELECT rule_text from d_rules where rule_id=?",
        (ruleid, )
    )

    sql=rule[0][0]

    contexto = {
        "<FIELD>": "test_field",
        "<TABLE>": "test_table",
        "<LIMIT>": 100
    }

    #Validamos siempre con una tabla dummy test_table.test_field para ver que el SQL sea correcto

    sql_a_validar = sustituir_tags(sql, contexto)
    try:
        columns = run_query(sql_a_validar, ())
        run_execute("update d_rules set rule_status='SQL Válido' where rule_id=?", (ruleid,))
        return{"ok": True}
    except:
        run_execute("update d_rules set rule_status='SQL NO Válido' where rule_id=?", (ruleid,))
        return{"ok":False}

########### Reglas de una tabla #############################################
@app.get("/rules/table/{tableid}/available")
def rulesavailable(tableid: int, categoryid: Optional[int]= Query(default=None), auth=Depends(require_auth)):
    # Listado de reglas no asignadas a una tabla
    sql = "select r.rule_id, r.rule_name, r.category_id, r.rule_text, r.rule_status, r.updated, c.category from d_rules r join d_category c on r.category_id=c.category_id where type_id=1 and rule_id not in (select distinct rule_id from rel_rules_tables where table_id=?) "
    params = (tableid, )

    if categoryid is not None:
        sql += " and category_id=?"
        params = params + (categoryid,)

    result = run_query(sql, params)

    return [{"ruleid":r[0], "rulename": r[1], "categoryid": r[2], "ruletext":r[3], "rulestatus":r[4], "updated":r[5], "category":r[6]} for r in result]

@app.get("/rules/table/{tableid}/assigned")
def rulesassigned(tableid: int, categoryid: Optional[int]= Query(default=None), auth=Depends(require_auth)):
    # Listado de reglas asignadas a una tabla
    sql = "select r.rule_id, r.rule_name, r.category_id, r.rule_text, r.rule_status, r.updated, c.category from d_rules r join d_category c on r.category_id=c.category_id where type_id=1 and rule_id in (select distinct rule_id from rel_rules_tables where table_id=?) "
    params = (tableid, )

    if categoryid is not None:
        sql += " and category_id=?"
        params = params + (categoryid,)

    result = run_query(sql, params)

    return [{"ruleid":r[0], "rulename": r[1], "categoryid": r[2], "ruletext":r[3], "rulestatus":r[4], "updated":r[5], "category":r[6]} for r in result]

@app.put("/rules/{ruleid}/assigntotable/{tableid}")
def ruleassigntotable(ruleid: int, tableid:int, auth=Depends(require_auth)):
    #Asigna una regla a una tabla

    run_execute("delete from rel_rules_tables where rule_id=? and table_id=?", (ruleid,tableid, ))
    run_execute("insert into rel_rules_tables (rule_id, table_id, status, statusdate) values (?,?,'Asignada - sin validar', now())", (ruleid,tableid))
    return{"ok":True}

@app.put("/rules/{ruleid}/deassignfromtable/{tableid}")
def ruledeassigntotable(ruleid: int, tableid:int, auth=Depends(require_auth)):
    #Desasigna una regla a una tabla

    run_execute("delete from rel_rules_tables where rule_id=? and table_id=?", (ruleid,tableid, ))
    return{"ok":True}

########### Reglas de una columna #############################################
@app.get("/rules/column/{columnid}/available")
def rulesavailablecol(columnid: int, categoryid: Optional[int]= Query(default=None), auth=Depends(require_auth)):
    # Listado de reglas no asignadas a una columna
    sql = "select r.rule_id, r.rule_name, r.category_id, r.rule_text, r.rule_status, r.updated, c.category from d_rules r join d_category c on r.category_id=c.category_id where type_id=2 and rule_id not in (select distinct rule_id from rel_rules_columns where column_id=?) "
    params = (columnid, )

    if categoryid is not None:
        sql += " and category_id=?"
        params = params + (categoryid,)

    result = run_query(sql, params)

    return [{"ruleid":r[0], "rulename": r[1], "categoryid": r[2], "ruletext":r[3], "rulestatus":r[4], "updated":r[5], "category":r[6]} for r in result]

@app.get("/rules/column/{columnid}/assigned")
def rulesassignedcol(columnid: int, categoryid: Optional[int]= Query(default=None), auth=Depends(require_auth)):
    # Listado de reglas asignadas a una columna
    sql = "select r.rule_id, r.rule_name, r.category_id, r.rule_text, r.rule_status, r.updated, c.category from d_rules r join d_category c on r.category_id=c.category_id where type_id=2 and rule_id in (select distinct rule_id from rel_rules_columns where column_id=?) "
    params = (columnid, )

    if categoryid is not None:
        sql += " and category_id=?"
        params = params + (categoryid,)

    result = run_query(sql, params)

    return [{"ruleid":r[0], "rulename": r[1], "categoryid": r[2], "ruletext":r[3], "rulestatus":r[4], "updated":r[5], "category":r[6]} for r in result]

@app.put("/rules/{ruleid}/assigntocolumn/{columnid}")
def ruleassigntocolumn(ruleid: int, columnid:int, auth=Depends(require_auth)):
    #Asigna una regla a una columna

    run_execute("delete from rel_rules_columns where rule_id=? and column_id=?", (ruleid,columnid, ))
    run_execute("insert into rel_rules_columns (rule_id, column_id, status, statusdate) values (?,?,'Asignada - sin validar', now())", (ruleid,columnid))
    return{"ok":True}

@app.put("/rules/{ruleid}/deassignfromcolumn/{columnid}")
def ruledeassigntocolumn(ruleid: int, columnid:int, auth=Depends(require_auth)):
    #Desasigna una regla de una columna

    run_execute("delete from rel_rules_columns where rule_id=? and column_id=?", (ruleid,columnid, ))
    return{"ok":True}

##### Ejecución de reglas e historial ################################################################################
@app.put("/rules/{ruleid}/execcolumn/{columnid}")
def ruleexeccolumn(ruleid: int, columnid:int):
    #Hace la ejecución de una regla de columna

    #Sacamos toda la info de la columna (tabla, campo, conexión) para preparar la ejecución
    try:
        result = run_query(
            """select `schema_name`, `table_name`, `column_name`, `server`, `database`, `user`, `password`, `port` from d_columns co
                join d_connections con on co.connection_id=con.connectionid where column_id=?""",
            (columnid,)
        )
        schema_name = result[0][0]
        table_name = result[0][1]
        column_name = result[0][2]
        server = result[0][3]
        database = result[0][4]
        user = result[0][5]
        password = result[0][6]
        port = result[0][7]

        conn_str = "Driver={MySQL ODBC 9.6 Unicode Driver};" + f"Server={server}; Database={database}; Uid={user}; Pwd={password}; Port:{port}"

        # Sacamos el SQL de la regla en sí
        result = run_query(
            "select rule_text from d_rules where rule_id=?",
            (ruleid,)
        )

        sql=result[0][0]

        contexto = {
            "<FIELD>": column_name,
            "<TABLE>": table_name,
            "<LIMIT>": 100
        }

        sql_a_ejecutar = sustituir_tags(sql, contexto)
        print (sql_a_ejecutar)
        print (conn_str)
        #try:

        result= run_query(query=sql_a_ejecutar, connstr=conn_str)
        valor = result[0][0]

        run_execute(
            "delete from f_exec_rules_columns_last where rule_id=? and column_id=?",
            (ruleid, columnid, ))

        run_execute(
            "insert into f_exec_rules_columns_last (rule_id, column_id, exec_date, exec_result, exec_status) values (?,?,now(), ?, 'Correcta')",
            (ruleid, columnid, valor,))

        run_execute(
            "insert into f_exec_rules_columns (rule_id, column_id, exec_date, exec_result, exec_status) values (?,?,now(), ?, 'Correcta')",
            (ruleid, columnid, valor,))

        return {"ok": True}
    except:
        run_execute(
            "insert into f_exec_rules_columns (rule_id, column_id, exec_date, exec_result, exec_status) values (?,?,now(), null, 'Error')",
            (ruleid, columnid, ))
        return {"ok": False}


@app.put("/rules/{ruleid}/exectable/{tableid}")
def ruleexectable(ruleid: int, tableid:int):
    #Hace la ejecución de una regla de tabla

    #Sacamos toda la info de la tabla para preparar la ejecución

    result = run_query(
        """select `schema_name`, `table_name`, `server`, `database`, `user`, `password`, `port` from d_tables t
            join d_connections con on t.connection_id=con.connectionid where table_id=?""",
        (tableid,)
    )
    schema_name = result[0][0]
    table_name = result[0][1]
    server = result[0][2]
    database = result[0][3]
    user = result[0][4]
    password = result[0][5]
    port = result[0][6]

    conn_str = "Driver={MySQL ODBC 9.6 Unicode Driver};" + f"Server={server}; Database={database}; Uid={user}; Pwd={password}; Port:{port}"

    # Sacamos el SQL de la regla en sí
    result = run_query(
        "select rule_text from d_rules where rule_id=?",
        (ruleid,)
    )

    sql=result[0][0]

    contexto = {
        "<TABLE>": table_name,
        "<LIMIT>": 100
    }

    sql_a_ejecutar = sustituir_tags(sql, contexto)
    print (sql_a_ejecutar)
    print (conn_str)
    try:

        result= run_query(query=sql_a_ejecutar, connstr=conn_str)
        valor = result[0][0]

        run_execute(
            "delete from f_exec_rules_tables_last where rule_id=? and table_id=?",
            (ruleid, tableid, ))

        run_execute(
            "insert into f_exec_rules_tables (rule_id, table_id, exec_date, exec_result, exec_status) values (?,?,now(), ?, 'Correcta')",
            (ruleid, tableid, valor,))

        run_execute(
            "insert into f_exec_rules_tables_last (rule_id, table_id, exec_date, exec_result, exec_status) values (?,?,now(), ?, 'Correcta')",
            (ruleid, tableid, valor,))

        return {"ok": True}
    except:
        run_execute(
            "insert into f_exec_rules_tables (rule_id, table_id, exec_date, exec_result, exec_status) values (?,?,now(), null, 'Error')",
            (ruleid, tableid, ))
        return {"ok": False}

@app.get("/rules/column/{columnid}/executions")
def rulecolexec(columnid: int, auth=Depends(require_auth)):
    # Lista las ejecuciones de reglas de un campo
    sql = "select exec_id, r.rule_name, exec_date, exec_result, exec_status from f_exec_rules_columns erc join d_rules r on erc.rule_id=r.rule_id where column_id=? order by 1 desc"
    params = (columnid, )

    result = run_query(sql, params)

    return [{"execid":r[0], "rulename": r[1], "execdate": r[2], "execresult":r[3], "execstatus":r[4]} for r in result]

@app.get("/rules/table/{tableid}/executions")
def ruletableexec(tableid: int, auth=Depends(require_auth)):
    # Lista las ejecuciones de reglas de una tabla
    sql = "select exec_id, r.rule_name, exec_date, exec_result, exec_status from f_exec_rules_tables ert join d_rules r on ert.rule_id=r.rule_id where table_id=? order by 1 desc"
    params = (tableid, )

    result = run_query(sql, params)

    return [{"execid":r[0], "rulename": r[1], "execdate": r[2], "execresult":r[3], "execstatus":r[4]} for r in result]

@app.get("/results")
def results(auth=Depends(require_auth)):
    # Devuelve los resultados estadísticos
    sql = "select category_id, category, medallion_id, medallion, value from v_results"
    params = ( )

    result = run_query(sql, params)

    return [{"categoryid":r[0], "category": r[1], "medallionid": r[2], "medallion":r[3], "value":r[4]} for r in result]

@app.get("/resultsvolumes")
def resultsvolumes(auth=Depends(require_auth)):
    # Devuelve los resultados estadísticos de volúmenes
    sql = "select category_id, category, medallion_id, medallion, value from v_results_volumes"
    params = ( )

    result = run_query(sql, params)

    return [{"categoryid":r[0], "category": r[1], "medallionid": r[2], "medallion":r[3], "value":r[4]} for r in result]

@app.get("/resultshist")
def resultshist(auth=Depends(require_auth)):
    # Devuelve los resultados estadísticos históricos
    sql = "select medallion_id, medallion, anio, mes, dia,  value from v_results_history order by 3,4,5,1"
    params = ( )

    result = run_query(sql, params)

    return [{"medallionid":r[0], "medallion": r[1], "anio": r[2], "mes":r[3], "dia":r[4], "value":r[5]} for r in result]

@app.get("/resultsvolumeshist")
def resultsvolumeshist(auth=Depends(require_auth)):
    # Devuelve los resultados estadísticos históricos de volúmenes
    sql = "select medallion_id, medallion, anio, mes, dia,  value from v_results_volumes_history order by 3,4,5,1"
    params = ( )

    result = run_query(sql, params)

    return [{"medallionid":r[0], "medallion": r[1], "anio": r[2], "mes":r[3], "dia":r[4], "value":r[5]} for r in result]

@app.get("/resultshist/{categoryid}")
def resultshistcat(categoryid: int, auth=Depends(require_auth)):
    # Devuelve los resultados estadísticos históricos de una categoría
    sql = "select medallion_id, medallion, anio, mes, dia,  value from v_results_history_cat where category_id=? order by 3,4,5,1"
    params = (categoryid, )

    result = run_query(sql, params)

    return [{"medallionid":r[0], "medallion": r[1], "anio": r[2], "mes":r[3], "dia":r[4], "value":r[5]} for r in result]

@app.get("/resultsexecs/{categoryid}")
def resultsexecs(categoryid: int, auth=Depends(require_auth)):
    # Devuelve los resultados de ejecuciones
    sql = "select medallion_id, medallion, table_name, column_name, rule_name, exec_result from v_execs where category_id=? order by 3,4,5,1"
    params = (categoryid,  )

    result = run_query(sql, params)

    return [{"medallionid":r[0], "medallion": r[1], "tablename": r[2], "columnname":r[3], "rulename":r[4], "execresult":r[5]} for r in result]

###### Bloque de llamadas LLM a Huggingface ###########################################################################
@app.put("/LLM")
def LLM(payload: prompt, auth=Depends(require_auth)):
    # Realiza la llamada al modelo remoto incluido el prompt y el texto

    texto = payload.userprompt

    prompt = f"""
SYSTEM:
Eres un generador de sentencias SQL para un sistema de reglas de calidad.
Debes generar una sentencia SQL que cumpla lo que indica el usuario en el siguiente texto:
{texto}

Considerando las siguientes directrices:
- Puedes utilizar los tags <FIELD> y <TABLE> como sustitutos del nombre del campo y de la tabla.
- El SQL debe devolver un valor numérico AGREGADO entre 0 y 1 en un único registro, siendo 0 un resultado malo y 1 un éxito total.

DEVUELVE EXCLUSIVAMENTE JSON VÁLIDO con esta estructura exacta:

{{"sql": "sql generado"}}

REGLAS ABSOLUTAS:
- No añadas comentarios, notas, títulos ni explicaciones.
- No incluyas comillas.
- No repitas el texto original.
- Si incumples el formato, la salida será descartada.

"""
    #API KEY borrada por seguridad
    client = OpenAI(
        base_url="https://router.huggingface.co/v1",
        api_key="INSERTA_API_KEY",
    )

    r = client.chat.completions.create(
        model="google/gemma-3-27b-it",
        messages=[{"role": "user", "content": prompt}]
    )

    # Tratamiento del texto devuelto
    raw_content = r.choices[0].message.content

    clean_json = raw_content.replace("```json\n", "").replace("\n```", "")

    data = json.loads(clean_json)

    return data['sql']


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)