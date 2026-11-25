export function pairResults(pairs=[],attempts=[]){
  return pairs.map(pair=>{
    const answers=attempts.filter(a=>a.pairId===pair.id);
    return {...pair,answers,complete:answers.length===2,partial:answers.length===1,
      lastAttempt:answers.slice().sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)||a.ordinal-b.ordinal).at(-1)};
  });
}
export function pairSummary(pairs,attempts){
  const results=pairResults(pairs,attempts);
  return {completedPairs:results.filter(p=>p.complete).length,partialPairs:results.filter(p=>p.partial).length};
}
