# Lisoflix

Plataforma de catálogo de filmes com sistema de usuários, favoritos e upload de foto de perfil.

## **Stack**

**Frontend:** HTML, CSS, JavaScript Vanilla  
**Backend:** Node.js + Express  
**Banco de dados:** Supabase Postgres  
**Storage:** AWS S3  
**Deploy:** Vercel  

## **Funcionalidades**

- **Autenticação:** Cadastro, login com JWT, proteção de rotas
- **Catálogo:** Lista de filmes com capa, título, ano e gênero
- **Busca:** Filtro por título em tempo real
- **Favoritos:** Usuário pode favoritar/desfavoritar filmes
- **Perfil:** Edição de nome, email, senha e foto de perfil
- **Player:** Modal com trailer do YouTube embutido
- **Responsivo:** Funciona em desktop e mobile

## **Como rodar**

**Backend:** `node index.js`  
**Frontend:** Abrir `index.html` no navegador

## **Rotas da API**

POST `/api/login` - Login  
GET `/api/filmes` - Lista filmes  
GET `/api/favoritos` - Lista favoritos do usuário

## **Autor**

Nicolas Matriciano
