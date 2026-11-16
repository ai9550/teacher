(function(root){
  function shufflePlayers(players, random=Math.random){
    const result=players.slice();
    for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}
    return result;
  }
  function nextTurn(players,current){
    let index=current, wrapped=false;
    for(let checked=0;checked<players.length;checked++){
      index=(index+1)%players.length;
      if(index===0)wrapped=true;
      if(!players[index].out)return {index,wrapped};
    }
    return null;
  }
  const engine={shufflePlayers,nextTurn};
  if(typeof module!=='undefined'&&module.exports)module.exports=engine;
  else root.roundEngine=engine;
})(typeof window==='undefined'?globalThis:window);
