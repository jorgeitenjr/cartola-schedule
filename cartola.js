const fetch = require('node-fetch');
const _ = require('lodash');
const positions = require('./positions');
const status = require('./status');
const auth = require('./auth');
const moment = require('moment');

const loginURL = 'https://login.globo.com/api/authentication';

const cartolaAPI = 'https://api.cartolafc.globo.com/';

const loginPayload = {
  payload: {
    serviceId: 4728,
  },
};

const authHeader = {
  'X-GLB-Token': '',
};

const doLogin = async logger => {
  loginPayload.payload.email = auth.user;
  loginPayload.payload.password = auth.pass;
  const loginResult = await fetch(loginURL, {
    method: 'post',
    body: JSON.stringify(loginPayload),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  try {
    const loginResultData = await loginResult.json();
    authHeader['X-GLB-Token'] = loginResultData.glbId;
  } catch (error) {
    logger.error(error);
  }
};

const getCurrentTeamLineup = async (allAthletes, logger) => {
  try {
    const result = await fetch(`${cartolaAPI}/auth/time/`, {
      method: 'get',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
    });
    const team = await result.json();
    const playersNotConfirmed = team.atletas.filter(athlete => athlete.status_id !== status.PRO.id);
    logger.info('Pending players: ', playersNotConfirmed.length);
    const playersConfirmed = team.atletas.filter(athlete => athlete.status_id === status.PRO.id);
    const currentPlayersValue = _.sumBy(playersConfirmed, 'preco_num');
    logger.info(`valor: ${team.patrimonio}`);
    const budget = team.patrimonio - currentPlayersValue;
    logger.info('budget: ', budget);
    const budgetPerPlayer = budget / playersNotConfirmed.length;
    logger.info('AVG budget per player: ', budgetPerPlayer);
    const newTeam = team.atletas.map(athlete => athlete.atleta_id);
    for (const player of playersNotConfirmed) {
      const newPlayer = findNewPlayer(allAthletes, newTeam, player, budgetPerPlayer);
      logger.info(`new: ${newPlayer.nome} / ${newPlayer.preco_num}`);
      const idx = newTeam.indexOf(player.atleta_id);
      newTeam[idx] = newPlayer.atleta_id;
    }
    logger.info('newTeam: ', newTeam);
    return newTeam;
  } catch (error) {
    logger.error('error', error);
  }
};

const findNewPlayer = (allAthletes, currentTeam, athlete, budgetPerPlayer) => {
  const position = athlete.posicao_id;
  const possibleAthletes = allAthletes.atletas.filter(
    athlete =>
      athlete.posicao_id === position &&
      athlete.status_id === 7 &&
      athlete.preco_num <= budgetPerPlayer &&
      !currentTeam.includes(athlete.atleta_id)
  );
  return _.orderBy(possibleAthletes, ['preco_num'], ['desc'])[0];
};

const scheduleTeam = async (teamLineup, logger) => {
  try {
    const result = await fetch(`${cartolaAPI}/auth/time/salvar`, {
      method: 'post',
      body: JSON.stringify(teamLineup),
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
    });
    logger.info('resultado Escalação:', await result.json());
  } catch (error) {
    logger.error(`Problema ao escalar: ${error}`);
  }
};

const getPlayerByPositionAndQuantity = (athletes, position, quantity) => {
  const found = _.orderBy(
    athletes.atletas.filter(
      athlete =>
        athlete.posicao_id === positions[position].id &&
        athlete.preco_num <= 8.33 &&
        athlete.status_id !== status['PRO'].id
    ),
    ['preco_num'],
    ['desc']
  );
  const index = found.length > quantity ? quantity : found.length;
  return found.splice(0, index);
};

const teamToTest = (athletes, logger) => {
  const team = [
    ...getPlayerByPositionAndQuantity(athletes, 'GOL', 1),
    ...getPlayerByPositionAndQuantity(athletes, 'LAT', 2),
    ...getPlayerByPositionAndQuantity(athletes, 'ZAG', 2),
    ...getPlayerByPositionAndQuantity(athletes, 'MEI', 3),
    ...getPlayerByPositionAndQuantity(athletes, 'ATA', 3),
    {
      atleta_id: 41929,
    },
  ];
  logger.debug('teamToTest: ', team.map(athlete => athlete.atleta_id));
  const realTeam = team.map(athlete => athlete.atleta_id);
  return {
    esquema: 3,
    atletas: realTeam,
    capitao: realTeam[0],
  };
};

/***
 * Get next running date based on the market closing date
 */

const getNextRunningDate = async logger => {
  const result = await fetch(`${cartolaAPI}/mercado/status`);
  const data = await result.json();
  const date = moment.unix(data.fechamento.timestamp);
  logger.info(`Next market close at: ${date.format('DD/MM/YYYY HH:mm')}`);
  return date.subtract(10, 'minutes');
};

const startSchedule = async logger => {
  try {
    const result = await fetch(`${cartolaAPI}/atletas/mercado`);
    const allAthletes = await result.json();
    await doLogin(logger);
    const teamLineup = {
      esquema: 3,
      atletas: [],
      capitao: 0,
    };
    teamLineup.atletas = await getCurrentTeamLineup(allAthletes);
    teamLineup.capitao = teamLineup.atletas[0];
    scheduleTeam(teamLineup, logger);
  } catch (error) {
    logger.error(`Error while changing team players: ${error}`);
  }
};

module.exports = {
  startSchedule,
  getNextRunningDate,
};
