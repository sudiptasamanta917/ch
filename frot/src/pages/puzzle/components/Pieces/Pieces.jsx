import './Pieces.css'
import Piece from './Piece'
import { useEffect, useRef, useState  } from 'react'
import { useAppContext }from '../../contexts/Context'
import { openPromotion } from '../../reducer/actions/popup'
import { getCastlingDirections } from '../../arbiter/getMoves'
import { updateCastling, detectStalemate, detectInsufficientMaterial, detectCheckmate} from '../../reducer/actions/game'

import { makeNewMove, clearCandidates, generateCandidates } from '../../reducer/actions/move'
import arbiter from '../../arbiter/arbiter'
import { getNewMoveNotation } from '../../helper'
import moveaudio from '../../assets/sound/move.mp3'
import socket from '../../pages/multiplayer/socket'

const Pieces = () => {
   
  


    const audio=new Audio(moveaudio)

    const { appState , dispatch } = useAppContext();
    const currentPosition = appState.position[appState.position.length-1]
    // console.log(currentPosition);

    useEffect(() => {
    


       
        socket.emit('doardData',({doardData:currentPosition}))
        socket.on('receive_doardData',(data)=>{
        //  console.log(data,"hhhhhhhhhhh");
        
        })
    
    
        return () => {
        //   socket.off('winnerBoard', doardData);
        //   socket.off('disconnect', onDisconnect);
       
        };
        
      }, [currentPosition]);

    const ref = useRef()
  

    const updateCastlingState = ({piece,file,rank}) => {
        const direction = getCastlingDirections({
            castleDirection:appState.castleDirection,
            piece,
            file,
            rank
        })
        if (direction){
            dispatch(updateCastling(direction))
        }
    }

    const openPromotionBox = ({rank,file,x,y}) => {
        dispatch(openPromotion({
            rank:Number(rank),
            file:Number(file),
            x,
            y
        }))
    }

    const calculateCoords = e => {
        const {top,left,width} = ref.current.getBoundingClientRect()
        const size = width / 10
        const y = Math.floor((e.clientX - left) / size) 
        const x = 9 - Math.floor((e.clientY - top) / size)

        return {x,y}
    }

    const move = e => {
        const {x,y} = calculateCoords(e)
        const [piece,rank,file] = e.dataTransfer.getData("text").split(',')
       
     
        if(appState.candidateMoves.find(m => m[0] === x && m[1] === y)){
            audio.play();
            const opponent = piece.startsWith('b') ? 'w' : 'b'
            const castleDirection = appState.castleDirection[`${piece.startsWith('b') ? 'white' : 'black'}`]

            if ((piece==='wp' && x === 9) || (piece==='bp' && x === 0)){
                openPromotionBox({rank,file,x,y})
                return
            }
            if (piece.endsWith('r') || piece.endsWith('k')){
                updateCastlingState({piece,file,rank})
            }
            const newPosition = arbiter.performMove({
                position:currentPosition,
                piece,rank,file,
                x,y
            })
            const newMove = getNewMoveNotation({
                piece,
                rank,
                file,
                x,
                y,
                position:currentPosition,
            })
           
            dispatch(makeNewMove({newPosition,newMove}))
            // console.log(newPosition,"new position");
            if (arbiter.insufficientMaterial(newPosition))
                dispatch(detectInsufficientMaterial())
            else if (arbiter.isStalemate(newPosition,opponent,castleDirection)){
                dispatch(detectStalemate())
            }
            else if (arbiter.isCheckMate(newPosition,opponent,castleDirection)){
                dispatch(detectCheckmate(piece[0]))
            }
        }
        dispatch(clearCandidates())

     
    }

    const onDrop = e => {
        e.preventDefault()
        
        move (e)
    }
    
    const onDragOver = e => {e.preventDefault()}



  
//   console.log(childValue,'childvalue');
const handleMovePieces=(e)=>{
    e.preventDefault();
    const {x,y} = calculateCoords(e)
    // const [piece,rank,file] = childValue;
    const piece=appState.piece
    const rank=appState.rank
    const file=appState.file
    // console.log(childValue);

 

    if(appState.candidateMoves.find(m => m[0] === x && m[1] === y)){
        audio.play();
        // console.log("kkkkkkkk",piece);
        const opponent = piece.startsWith('b') ? 'w' : 'b'
        const castleDirection = appState.castleDirection[`${piece.startsWith('b') ? 'white' : 'black'}`]

        if ((piece==='wp' && x === 9) || (piece==='bp' && x === 0)){
            openPromotionBox({rank,file,x,y})
            return
        }
        if (piece.endsWith('r') || piece.endsWith('k')){
            // console.log("update castling");
            updateCastlingState({piece,file,rank})
        }
      
        const newPosition = arbiter.performMove({
            position:currentPosition,
            piece,rank,file,
            x,y
        })
        const newMove = getNewMoveNotation({
            piece,
            rank,
            file,
            x,
            y,
            position:currentPosition,
        })
        dispatch(makeNewMove({newPosition,newMove}))
        // console.log(newPosition,newMove,"new position");
        if (arbiter.insufficientMaterial(newPosition))
            {
                dispatch(detectInsufficientMaterial())
                // console.log("its calles detect");

            }
        else if (arbiter.isStalemate(newPosition,opponent,castleDirection)){
            // console.log("stalemee called");
            dispatch(detectStalemate())
        }
        else if (arbiter.isCheckMate(newPosition,opponent,castleDirection)){
            dispatch(detectCheckmate(piece[0]))
        }
        dispatch(clearCandidates())
    }
}

    return <div 
        className='pieces' 
        ref={ref} 
        onDrop={onDrop} 
        onClick={(e)=>handleMovePieces(e)}
        onDragOver={onDragOver}
        
        > 
        {currentPosition.map((r,rank) => 
            r.map((f,file) => 
                currentPosition[rank][file]
                ?   <Piece 
                        
                        key={rank+'-'+file} 
                        rank = {rank}
                        file = {file}
                        piece = {currentPosition[rank][file]}
                       
                    />
                :   null
            )   
        )}
    </div>
}

export default Pieces