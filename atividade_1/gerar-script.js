require("dotenv").config();
const fs = require("fs"); //manipulação de arquivos
const path = require("path"); //caminho
const bcrypt = require("bcryptjs"); //senha
const crypto = require("crypto"); //criptografia

//função para fazer a criptografia do cpf
function criptografraCpf(texto) {
  //dizendo como trabalhar
  const cifra = crypto.createCipheriv(
    //função da bibliotrca crypto
    "aes-256-cbc",
    process.env.CRIPTO_CHAVE,
    process.env.CRIPTO_IV,
  ); //importanto do dotenv chave privada e publica

  //retorno do valor criptografdo
  return cifra.update(texto, "utf8", "hex") + cifra.final("hex"); //hexadecimal
}

//salvar senha
const senhaHash = bcrypt.hashSync("1234", 10); //senha e salto. senhas com hash diferetes

const cpf1 = criptografraCpf("12312312322");
const cpf2 = criptografraCpf("12312312333");
const cpf3 = criptografraCpf("12312312344");

const sql = `CREATE DATABASE IF NOT EXISTS fisioterapia;
USE fisioterapia;

CREATE TABLE usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL
);

CREATE TABLE pacientes (
  id_paciente INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cpf VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  email VARCHAR(100)
);

CREATE TABLE planos_tratamento (
  id_plano_tratamento INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente INT NOT NULL,
  descricao VARCHAR(300),
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente)
);

CREATE TABLE sessoes (
  id_sessao INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente INT NOT NULL,
  id_plano_tratamento INT NOT NULL, 
  data_sessao DATETIME NOT NULL,
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente),
  FOREIGN KEY (id_plano_tratamento) REFERENCES planos_tratamento(id_plano_tratamento)
);






INSERT INTO pacientes (nome, cpf, telefone) VALUES
('Ana Souza', '${cpf1}', '11999999999'),
('Pedro Lima', '${cpf2}', '11988888888'),
('Maria Santos', '${cpf3}', '11977777777');


INSERT INTO planos_tratamento (descricao, id_paciente) VALUES
('Plano de reabilitação para dores articulares, com exercícios de mobilidade e fortalecimento das regiões afetadas.',  1),
('Tratamento respiratório com exercícios para auxiliar na expansão pulmonar e melhorar a capacidade respiratória',  2),
('Fisioterapia preventiva para melhorar o equilíbrio, a flexibilidade e a resistência muscular', 3);



INSERT INTO sessoes (data_sessao, id_paciente, id_plano_tratamento) VALUES
('2026-11-10 08:00:00', 1, 1),
('2026-11-11 10:00:00', 2, 2),
('2026-11-12 14:00:00', 3, 3);`;

const caminhoSaida = path.join(__dirname, "database", "script.sql"); //criar o caminho que vai salvar o arquivo

fs.writeFileSync(caminhoSaida, sql); //cria o arquivo

console.log(`Arquivo gerado em ${caminhoSaida}`);
