require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const Mustache = require("mustache");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const metodo = String(req.body?._method || "").toUpperCase();
  if (req.method === "POST" && ["PUT", "DELETE"].includes(metodo)) {
    req.method = metodo;
  }
  next();
});

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dateStrings: true,
});

function mostrar(nome, dados = {}) {
  const arquivo = path.join(__dirname, "paginas", `${nome}.html`);
  return Mustache.render(fs.readFileSync(arquivo, "utf-8"), dados);
}

function criptografar(texto) {
  const cifra = crypto.createCipheriv(
    "aes-256-cbc",
    process.env.CRIPTO_CHAVE,
    process.env.CRIPTO_IV,
  );
  return cifra.update(texto, "utf8", "hex") + cifra.final("hex");
}

function descriptografar(texto) {
  if (typeof texto !== "string") {
    throw new TypeError("O CPF armazenado precisa ser um texto.");
  }

  if (!/^(?:[0-9a-f]{32})+$/i.test(texto)) {
    console.warn(
      "CPF legado sem criptografia encontrado; ele será criptografado ao ser salvo novamente.",
    );
    return texto;
  }

  const decifra = crypto.createDecipheriv(
    "aes-256-cbc",
    process.env.CRIPTO_CHAVE,
    process.env.CRIPTO_IV,
  );
  return decifra.update(texto, "hex", "utf8") + decifra.final("utf8");
}

async function excluir(res, tabela, colunaId, id, volta, motivo) {
  try {
    await db.query(`DELETE FROM ${tabela} WHERE ${colunaId} = ?`, [id]);
    res.redirect(volta);
  } catch (erro) {
    if (erro.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).send(
        `<p>Nao foi possivel excluir: ${motivo}</p>
         <p><a href="${volta}">Voltar</a></p>`,
      );
    }
    console.error(erro);
    res.status(500).send(
      `<p>Erro ao excluir.</p>
       <p><a href="${volta}">Voltar</a></p>`,
    );
  }
}

// LOGIN
app.get("/", (req, res) => res.send(mostrar("login")));

app.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  const [usuarios] = await db.query(
    "SELECT * FROM usuarios WHERE email = ?",
    [email],
  );
  const usuario = usuarios[0];

  if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
    return res.send(mostrar("login", { erro: "E-mail ou senha invalidos." }));
  }

  const token = jwt.sign(
    { id_usuario: usuario.id_usuario, nome: usuario.nome },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );
  res.cookie("token", token, { httpOnly: true });
  res.redirect("/principal");
});

app.post("/sair", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

app.use((req, res, next) => {
  try {
    req.usuario = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    next();
  } catch (erro) {
    res.redirect("/");
  }
});

app.get("/principal", (req, res) =>
  res.send(mostrar("principal", { nome: req.usuario.nome })),
);

// PACIENTES
app.get("/pacientes", async (req, res) => {
  const busca = req.query.busca || "";
  const [lista] = await db.query(
    "SELECT * FROM pacientes WHERE nome LIKE ?",
    [`%${busca}%`],
  );
  const pacientes = lista.map((paciente) => ({
    ...paciente,
    cpf: descriptografar(paciente.cpf),
  }));
  const editar = pacientes.find(
    (paciente) => String(paciente.id_paciente) === req.query.editar,
  );

  res.send(mostrar("pacientes", {
    busca,
    pacientes,
    editando: Boolean(editar),
    acao: editar
      ? `/pacientes/${editar.id_paciente}`
      : "/pacientes",
    form: editar || {},
  }));
});

app.post("/pacientes", async (req, res) => {
  const { nome, cpf, telefone, email } = req.body;
  await db.query(
    "INSERT INTO pacientes (nome, cpf, telefone, email) VALUES (?, ?, ?, ?)",
    [nome, criptografar(cpf), telefone || null, email || null],
  );
  res.redirect("/pacientes");
});

app.put("/pacientes/:id", async (req, res) => {
  const { nome, cpf, telefone, email } = req.body;
  await db.query(
    `UPDATE pacientes
     SET nome = ?, cpf = ?, telefone = ?, email = ?
     WHERE id_paciente = ?`,
    [nome, criptografar(cpf), telefone || null, email || null, req.params.id],
  );
  res.redirect("/pacientes");
});

app.delete("/pacientes/:id", async (req, res) => {
  await excluir(
    res,
    "pacientes",
    "id_paciente",
    req.params.id,
    "/pacientes",
    "O paciente possui planos de tratamento ou sessoes cadastradas.",
  );
});

// PLANOS DE TRATAMENTO
async function mostrarPlanos(req, res, erro = "") {
  const [listaPlanos] = await db.query(
    "SELECT * FROM planos_tratamento ORDER BY id_plano_tratamento",
  );
  const [pacientes] = await db.query(
    "SELECT id_paciente, nome FROM pacientes ORDER BY nome",
  );
  const editar = listaPlanos.find(
    (plano) =>
      String(plano.id_plano_tratamento) === req.query.editar,
  );
  const pacientesOpcoes = pacientes.map((paciente) => ({
    ...paciente,
    selecionado:
      editar && paciente.id_paciente === editar.id_paciente
        ? "selected"
        : "",
  }));

  res.send(mostrar("plano_tratamento", {
    planos_tratamento: listaPlanos,
    pacientes: pacientesOpcoes,
    erro,
    editando: Boolean(editar),
    acao: editar
      ? `/planos_tratamento/${editar.id_plano_tratamento}`
      : "/planos_tratamento",
    form: editar || {},
  }));
}

app.get("/planos_tratamento", (req, res) =>
  mostrarPlanos(req, res),
);

app.post("/planos_tratamento", async (req, res) => {
  const { id_paciente, descricao } = req.body;
  if (!id_paciente) {
    return mostrarPlanos(req, res, "Selecione um paciente.");
  }
  await db.query(
    "INSERT INTO planos_tratamento (id_paciente, descricao) VALUES (?, ?)",
    [id_paciente, descricao],
  );
  res.redirect("/planos_tratamento");
});

app.put("/planos_tratamento/:id", async (req, res) => {
  const { id_paciente, descricao } = req.body;
  if (!id_paciente) {
    return mostrarPlanos(req, res, "Selecione um paciente.");
  }
  await db.query(
    `UPDATE planos_tratamento
     SET id_paciente = ?, descricao = ?
     WHERE id_plano_tratamento = ?`,
    [id_paciente, descricao, req.params.id],
  );
  res.redirect("/planos_tratamento");
});

app.delete("/planos_tratamento/:id", async (req, res) => {
  await excluir(
    res,
    "planos_tratamento",
    "id_plano_tratamento",
    req.params.id,
    "/planos_tratamento",
    "O plano possui sessoes cadastradas.",
  );
});

// SESSOES
app.get("/sessoes", async (req, res) => {
  const [lista] = await db.query(
    `SELECT sessoes.*,
            planos_tratamento.descricao AS plano_descricao,
            pacientes.nome AS paciente_nome
     FROM sessoes
     JOIN planos_tratamento
       ON planos_tratamento.id_plano_tratamento = sessoes.id_plano_tratamento
     JOIN pacientes
       ON pacientes.id_paciente = sessoes.id_paciente
     ORDER BY sessoes.data_sessao`,
  );
  const [pacientes] = await db.query(
    "SELECT id_paciente, nome FROM pacientes ORDER BY nome",
  );
  const [planos] = await db.query(
    `SELECT id_plano_tratamento, descricao
     FROM planos_tratamento
     ORDER BY id_plano_tratamento`,
  );
  const sessoes = lista.map((sessao) => ({
    ...sessao,
    data_br: new Date(sessao.data_sessao).toLocaleString("pt-BR"),
    data_input: sessao.data_sessao
      .slice(0, 16)
      .replace(" ", "T"),
  }));

  res.send(mostrar("sessoes", {
    sessoes,
    pacientes,
    planos_tratamento: planos,
  }));
});

app.post("/sessoes", async (req, res) => {
  const { id_paciente, id_plano_tratamento, data_sessao } = req.body;
  await db.query(
    `INSERT INTO sessoes
     (id_paciente, id_plano_tratamento, data_sessao)
     VALUES (?, ?, ?)`,
    [
      id_paciente,
      id_plano_tratamento,
      data_sessao.replace("T", " "),
    ],
  );
  res.redirect("/sessoes");
});

app.put("/sessoes/:id", async (req, res) => {
  await db.query(
    "UPDATE sessoes SET data_sessao = ? WHERE id_sessao = ?",
    [req.body.data_sessao.replace("T", " "), req.params.id],
  );
  res.redirect("/sessoes");
});

app.delete("/sessoes/:id", async (req, res) => {
  await excluir(
    res,
    "sessoes",
    "id_sessao",
    req.params.id,
    "/sessoes",
    " ",
  );
});

const porta = process.env.PORT || 3000;
app.listen(porta, () =>
  console.log(`Fisioterapia rodando em http://localhost:${porta}`),
);