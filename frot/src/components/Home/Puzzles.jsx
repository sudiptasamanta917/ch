import React from "react";
import banner from "../../assets/banner_special.png";

function Puzzles () {

    return (
        <>
            <div className="rounded-md py-5 px-2 my-5 bg-[#262522] grid grid-cols-2">
                <div className="flex flex-col items-center justify-center">
                    <h1 className="text-white text-3xl font-bold">
                        New Chess Piece
                    </h1>
                    <div
                        className="h-28 w-44 my-10 rounded-2xl bg-[#6ca732] shadow-md 
                          shadow-green-400/40
                          px-4 py-3 flex flex-col items-center justify-center"
                    >
                        <h1 className="text-white text-2xl font-bold">
                            Missile
                        </h1>
                        <p className="text-white font-semibold">
                            Bishop + Knight
                        </p>
                    </div>
                    <div className="w-96 font-semibold text-xl text-[#c5c5c4]">
                        Best way to improve pattern recognition also new
                        experience with 10x10 chess Board and new piece Missile(Bishop + Knight).
                    </div>
                </div>
                <div
                    className="bg-contain bg-center mx-auto bg-no-repeat aspect-[3/4] h-[400px]"
                    style={{
                        backgroundImage: `url(${banner})`,
                    }}
                ></div>
            </div>
        </>
    );
}

export default Puzzles