# cartola-schedule
Se você, com uma frequência maior do que gostaria esquece de escalar o seu time no [CartolaFC](https://cartolafc.globo.com/), esse package é para você.
A schedule rodará 10 minutos antes do fechamento de cada rodada e irá substituir os jogadores não confirmados do seu time por jogadores confirmados, dentro 
das suas cartoletas disponíveis.
# Instalar dependências
    npm install
# Autenticação
É necessário incluir suas credenciais do cartola no arquivo ```auth.js``` para o seu time ser escalado:
```

module.exports = {
  user: 'USER',
  pass: 'PASS',
};

```
# Inicar schedule
    npm start
# Executar como serviço (Recomendado)    
    pm2 start cartola-schedule.config.json
    