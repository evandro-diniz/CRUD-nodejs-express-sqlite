// Importação de módulos
const express = require("express");
const { engine } = require("express-handlebars");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { title, send } = require("process");
const fileupload = require("express-fileupload");
const fs = require("fs"); // Manipulação de pastas e arquivos

// Configuração do Express
const app = express();
const port = 3000;

// Habilitando upload de arquivos
app.use(fileupload());

// Adicionar Bootstrap
app.use("/bootstrap", express.static("./node_modules/bootstrap/dist"));

// Configuração do Handlebars como motor de templates
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "./views");

// Manipulação de dados via rotas
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configuração para servir arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Conexão com o banco de dados
const conexao = new sqlite3.Database("./clientes.db", (erro) => {
  if (erro) {
    console.error("Erro ao abrir o banco:", erro.message);
  } else {
    console.log("Conexão com SQLite estabelecida!");
  }
});

// Criar tabela
conexao.serialize(() => {
  conexao.run(
    `   
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      endereco TEXT NOT NULL
    )
  `,
    (erro) => {
      if (erro) {
        console.error("Erro ao criar tabela:", erro.message);
      } else {
        console.log("Tabela criada com sucesso!");
      }
    }
  );
});

// Rotas
app.get("/", (req, res) => {
  res.render("index", {
    title: "Home",
    cabecalho: "Página Inicial",
    menu: [
      { name: "Home", link: "/" },
      {
        name: "Serviços",
        link: "/servicos",
        submenu: [
          { name: "Desenvolvimento Web", link: "/servicos/web" },
          { name: "Design Gráfico", link: "/servicos/design" },
        ],
      },
      { name: "Contato", link: "/contato" },
    ],
  });
});

app.get("/sobre", (req, res) => {
  res.render("sobre", { title: "Sobre", cabecalho: "Mais Informações" });
});

app.get("/cadastro", (req, res) => {
  const sql = "SELECT * FROM produtos";

  conexao.all(sql, (erro, rows) => {
    if (erro) {
      console.error("Erro ao consultar o banco de dados:", erro.message);
      return res.status(500).send("Erro ao carregar os produtos.");
    }

    res.render("cadastro", {
      title: "Cadastro",
      cabecalho: "Cadastrar Personagens",
      produtos: rows,
    });

    // Log para verificar os dados
    rows.forEach((row) => {
      console.log(`ID: ${row.id}, Nome: ${row.nome}, Valor: ${row.valor}`);
    });
  });
});

app.get("/blog", (req, res) => {
  res.render("blog", { title: "Blog", cabecalho: "Blog do Evandro." });
});

// Rota do formulário
app.get("/contato", (req, res) => {
  res.render("contato", { title: "Contatos", cabecalho: "Contatos." });
});

// Rota do cadastro de usuário
app.post("/contatos", (req, res) => {
  res.send("Rota contatos");
});

app.post("/cadastrar", (req, res) => {
  // Verifica se o arquivo foi enviado
  if (!req.files || !req.files.imagem) {
    return res.status(400).send("Nenhum arquivo foi enviado.");
  }

  let nome = req.body.nome;
  let valor = req.body.valor;
  let imagem = req.files.imagem.name;

  let sql = `INSERT INTO produtos (nome, valor, imagem) VALUES (?, ?, ?)`;

  // Executa a inserção no banco de dados
  conexao.run(sql, [nome, valor, imagem], function (erro) {
    if (erro) {
      console.error("Erro ao inserir no banco de dados:", erro.message);
      return res.status(500).send("Erro ao cadastrar o produto.");
    }

    // Move o arquivo para o diretório desejado
    req.files.imagem.mv(
      __dirname + "/public/images/uploads/" + imagem,
      (err) => {
        if (err) {
          console.error("Erro ao mover o arquivo:", err.message);
          return res.status(500).send("Erro ao salvar a imagem.");
        }
        console.log("Produto cadastrado com sucesso:", this.lastID);
        res.redirect("/cadastro");
      }
    );
  });
});

app.post("/atualizar", (req, res) => {
  let id = req.body.id;
  let nome = req.body.nome;
  let valor = req.body.valor;

  let sql = `UPDATE produtos SET nome = ?, valor = ? WHERE id = ?`;

  // Se uma nova imagem for enviada
  if (req.files && req.files.imagem) {
    let imagem = req.files.imagem.name;

    // Atualiza o banco de dados, incluindo a imagem
    sql = `UPDATE produtos SET nome = ?, valor = ?, imagem = ? WHERE id = ?`;

    conexao.run(sql, [nome, valor, imagem, id], function (erro) {
      if (erro) {
        console.error("Erro ao atualizar o banco de dados:", erro.message);
        return res.status(500).send("Erro ao atualizar o produto.");
      }

      // Substitui a imagem antiga
      req.files.imagem.mv(
        __dirname + "/public/images/uploads/" + imagem,
        (err) => {
          if (err) {
            console.error("Erro ao mover o arquivo:", err.message);
            return res.status(500).send("Erro ao salvar a nova imagem.");
          }
          console.log("Produto atualizado com sucesso:", id);
          res.redirect("/cadastro");
        }
      );
    });
  } else {
    // Atualiza o banco de dados sem alterar a imagem
    conexao.run(sql, [nome, valor, id], function (erro) {
      if (erro) {
        console.error("Erro ao atualizar o banco de dados:", erro.message);
        return res.status(500).send("Erro ao atualizar o produto.");
      }

      console.log("Produto atualizado com sucesso:", id);
      res.redirect("/cadastro");
    });
  }
});

app.get("/pesquisa", (req, res) => {
  const nome = req.query.nome || ""; // Recebe o termo da URL
  const sql = "SELECT * FROM produtos WHERE nome LIKE ?";

  conexao.all(sql, [`%${nome}%`], (erro, resultados) => {
    if (erro) {
      console.error("Erro ao buscar resultados:", erro.message);
      return res.status(500).send("Erro no servidor.");
    }

    res.render("pesquisa", {
      title: "Pesquisar Produtos",
      cabecalho: "Resultados da Pesquisa",
      produtos: resultados,
      termo: nome, // Para manter o termo no input de pesquisa
    });
  });
});

app.get("/editar/:id", (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).send("ID não informado.");
  }

  let sql = `SELECT * FROM produtos WHERE id = ?`;

  conexao.get(sql, [id], (erro, rows) => {
    if (erro) {
      console.error("Erro ao consultar o banco de dados:", erro.message);
      return res.status(500).send("Erro ao carregar o produto.");
    }

    res.render("editar", {
      title: "Editar",
      cabecalho: "Editar Informações",
      personagem: rows,
    });
  });
});

app.get("/remover/:id/:imagem", (req, res) => {
  const id = req.params.id;
  const imagem = req.params.imagem;

  // Validação dos parâmetros
  if (!id || !imagem) {
    return res.status(400).send("Parâmetros inválidos.");
  }

  // SQL seguro com placeholders
  let sql = `DELETE FROM produtos WHERE id = ?`;

  conexao.run(sql, [id], function (erro) {
    if (erro) {
      console.error("Erro ao remover do banco de dados:", erro.message);
      return res.status(500).send("Erro ao remover o produto.");
    }

    // Remover a imagem associada
    const imagemPath = path.join(__dirname, "public/images/uploads", imagem);

    fs.unlink(imagemPath, (erroImagem) => {
      if (erroImagem) {
        console.error("Erro ao remover a imagem:", erroImagem.message);
        return res.status(500).send("Erro ao remover a imagem do servidor.");
      }

      console.log("Produto e imagem removidos com sucesso!");
      res.redirect("/cadastro");
    });
  });
});

// Inicialização servidor
app.listen(port, () => {
  console.log(`Servidor rodando em: http://localhost:${port}`);
});
