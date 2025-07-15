import arbiter from '../../arbiter/arbiter';
import { useAppContext } from '../../contexts/Context'
import { PiecePosition, generateCandidates } from '../../reducer/actions/move';


import Bbishop from '../../../../assets/ducpices/BLACK/bb.png';
import Bking from '../../../../assets/ducpices/BLACK/bk2.png';
import Bknight from '../../../../assets/ducpices/BLACK/bn.png';
import Bpawn from '../../../../assets/ducpices/BLACK/bp2.png';
import Bqueen from '../../../../assets/ducpices/BLACK/bq2.png';
import Brook from '../../../../assets/ducpices/BLACK/br2.png';
import Bmisile from '../../../../assets/ducpices/BLACK/bm.png';
import Wbishop from '../../../../assets/ducpices/WHITE/wb.png';
import Wking from '../../../../assets/ducpices/WHITE/wk2.png';
import Wknight from '../../../../assets/ducpices/WHITE/wn.png';
import Wpawn from '../../../../assets/ducpices/WHITE/wp2.png';
import Wqueen from '../../../../assets/ducpices/WHITE/wq2.png';
import Wrook from '../../../../assets/ducpices/WHITE/wr2.png'
import Wmisile from '../../../../assets/ducpices/WHITE/wm.png';
import { useState } from 'react';

const pieceImages = {
    bp: Bpawn, br: Brook, bn: Bknight, bb: Bbishop, bq: Bqueen, bk: Bking, bm: Bmisile,
    wp: Wpawn, wr: Wrook, wn: Wknight, wb: Wbishop, wq: Wqueen, wk: Wking, wm: Wmisile,
};



const Piece = ({
    rank,
    file,
    piece,
  
}) => {

    const { appState, dispatch } = useAppContext();
    const { turn, castleDirection, position: currentPosition } = appState
    const displayedPosition=appState.currentDisplayedPosition
    const playerId=appState?.PlayerId
    // console.log(playerId,"zssssssssssssss");
   
//    console.log(appState,"yyyyyyyyyyyyyyyy");
    const onDragStart = e => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", `${piece},${rank},${file}`)
        
        setTimeout(() => {
            e.target.style.display = 'none'
        }, 0)

        if (!displayedPosition && turn === piece[0]) {
            const candidateMoves =
                arbiter.getValidMoves({
                    position: currentPosition[currentPosition.length - 1],
                    prevPosition: currentPosition[currentPosition.length - 2],
                    castleDirection: castleDirection[turn],
                    piece,
                    file,
                    rank,
                    playerId
                })
            dispatch(generateCandidates({ candidateMoves }))
            dispatch(PiecePosition(piece,file,rank))
        }

    }
    const onDragEnd = e => {
        e.target.style.display = 'block'
    }

    const onClickPiece = (e) => {
        // Set data, handle game logic, etc.
        if (!displayedPosition && turn === piece[0]) {
           
            const candidateMoves =
                arbiter.getValidMoves({
                    position: currentPosition[currentPosition.length - 1],
                    prevPosition: currentPosition[currentPosition.length - 2],
                    castleDirection: castleDirection[turn],
                    piece,
                    file,
                    rank,
                    playerId

                });
            dispatch(generateCandidates({ candidateMoves,piece,file,rank,playerId }));
            dispatch(PiecePosition(piece,file,rank))
         
        }

    }


    return (
        <div
            className={`piece flex justify-center  p-[1px]   L-${file}${rank} `}
            draggable={true}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={(e) => onClickPiece(e)}
            
        >
            {
                piece == 'br' || piece == 'wr' ?
                    <img src={pieceImages?.[piece]} alt="" 
                    // className='md:h-10 h-5 mt-0.5   md:mt-1.5'
                     />
                    :
                    piece == 'bn' || piece == 'wn' ?
                        <img src={pieceImages?.[piece]} alt="" className='' />
                        :
                    piece == 'bk' || piece == 'wk' ?
                        <img src={pieceImages?.[piece]} alt="" className='' />
                        :
                    piece == 'bq' || piece == 'wq' ?
                        <img src={pieceImages?.[piece]} alt="" 
                        // className='relative h-[28px]  bottom-0.5   md:h-14  md:bottom-1'
                         />
                        :
                        <img src={pieceImages?.[piece]} alt="" className='' />

            }


        </div>)
}

export default Piece