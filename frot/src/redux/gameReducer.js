import { GET_LOADING, Game_Status, Get_Game, Get_Navigation,Get_Sound, TOURNAMENT_STATUS, Tournament_Start_Popup } from "./constant";
import { Status } from '../constants/gameConstants';

export const gameData = (state = { loading: false, data: [],TournamentPopupData:{initialTimeRemaining:null, joinUrl:'null',ShowPopup:false} }, action) => {
  // console.log("gamestatus reducer",action.payload);
  switch (action.type) {
    case Get_Game:
      return { ...state, data: action.data };
    case GET_LOADING:
      return { ...state, loading: action.payload };
    case Game_Status:
      return { ...state, GameStatus: action.payload };
    case TOURNAMENT_STATUS:
      return { ...state, TournamentStatus: action.payload };
    case Tournament_Start_Popup:
      return { ...state, TournamentPopupData: action.payload };
    default:
      return state;
  }
};



export const gamenavigation = (state = { loading: false, data: true }, action) => {
  // console.log("gamenavigation");
  switch (action.type) {
    case Get_Navigation:
      return { ...state, data: action.payload };
    case GET_LOADING:
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};


export const gamesound = (state = { loading: false, data: true }, action) => {
  // console.log("gamesound");
  switch (action.type) {
    case Get_Sound:
      return { ...state, data: action.payload };
    case GET_LOADING:
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

const gameReducer = (state, action) => {
  switch (action.type) {
    case 'SET_POSITION':
      return {
        ...state,
        position: action.payload
      };

    case 'SET_TURN':
      return {
        ...state,
        turn: action.payload
      };

    case 'SET_CANDIDATE_MOVES':
      return {
        ...state,
        candidateMoves: action.payload
      };

    case 'CLEAR_CANDIDATE_MOVES':
      return {
        ...state,
        candidateMoves: []
      };

    case 'SET_PROMOTION_SQUARE':
      return {
        ...state,
        promotionSquare: action.payload
      };

    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload
      };

    case 'SET_CASTLE_DIRECTION':
      return {
        ...state,
        castleDirection: {
          ...state.castleDirection,
          [action.payload.color]: action.payload.direction
        }
      };

    case 'SET_PLAYER_ID':
      return {
        ...state,
        PlayerId: action.payload
      };

    case 'SET_CURRENT_INDEX':
      return {
        ...state,
        currentIndex: action.payload
      };

    case 'MAKE_NEW_MOVE':
      const { position, turn, castleDirection } = action.payload;
      return {
        ...state,
        position: [...state.position, position],
        turn: turn,
        castleDirection: castleDirection,
        status: Status.ongoing,
        currentIndex: state.currentIndex + 1
      };

    default:
      return state;
  }
};

export default gameReducer;
