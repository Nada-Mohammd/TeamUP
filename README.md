# TeamUP
## Setup & Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/Nada-Mohammd/TeamUP.git
   cd TeamUp_backend
2. Install dependencies: npm install
3. start the server:   npm start
## Test Login (Postman)
URL:
```bash
http://localhost:5001/api/auth/login
Request Body (JSON):
```bash
{
  "email": "20221157@stud.fci-cu.edu.eg",
  "password": "123456",
  "rememberMe": true
}


Running Tests

To run the integration test for the **User model**, use the following command in the terminal:

```bash
node tests/userModeltest.js

