require('dotenv').config()
const fs = require('fs') //manipulação de arquivos
const path = require('path') //caminho
const bcrypt = require('bcryptjs') //senha
const crypto = require ('crypto') //criptografia




//função para fazer a criptografia do cpf
function criptografraCpf(texto) {
    //dizendo como trabalhar
    const cifra = crypto.createCipheriv  //função da bibliotrca crypto
        ('aes-256-cbc', process.env.CRIPTO_CHAVE, process.env.CRIPTO_IV) //importanto do dotenv chave privada e publica




    //retorno do valor criptografdo
    return cifra.update(texto, 'utf8', 'hex') + cifra.final('hex') //hexadecimal
}




//salvar senha
const senhaHash = bcrypt.hashSync('1234', 10) //senha e salto. senhas com hash diferetes




const cpf1= criptografraCpf('12312312322')
const cpf2 = criptografraCpf('12312312333')
const cpf3 = criptografraCpf('12312312344')




const sql = `CREATE DATABASE IF NOT EXISTS oficina;
USE oficina;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL
);

CREATE TABLE clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cpf VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  email VARCHAR(100)
);

CREATE TABLE veiculos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  placa VARCHAR(10) NOT NULL,
  marca VARCHAR(50),
  modelo VARCHAR(50),
  ano INT,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE agendamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  veiculo_id INT NOT NULL,
  data_agendamento DATETIME NOT NULL,
  servico VARCHAR(100),
  FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)
);







INSERT INTO cliente (nome, cpf, telefone, senha) VALUES
('Ana Souza', '${cpf1}', '11999999999', '${senhaHash}'),
('Pedro Lima', '${cpf2}', '11988888888', '${senhaHash}'),
('Maria Santos', '${cpf3}', '11977777777', ''${senhaHash});


INSERT INTO veiculo (marca, modelo, cliente_id) VALUES
('Fiat', 'Uno', 1),
('Honda', 'Civic', 2),
('Volkswagen', 'Gol', 3);



INSERT INTO agendamento (data_hora, usuario_id, veiculo_id) VALUES
('2026-11-10 08:00:00', 1, 1),
('2026-11-11 10:00:00', 1, 2),
('2026-11-12 14:00:00', 1, 3);`




const caminhoSaida = path.join(__dirname, 'database', 'script.sql') //criar o caminho que vai salvar o arquivo




fs.writeFileSync(caminhoSaida,sql) //cria o arquivo




console.log(`Arquivo gerado em ${caminhoSaida}`)