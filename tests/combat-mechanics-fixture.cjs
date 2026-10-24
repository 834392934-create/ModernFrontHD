for(const name of ['data','roster','equipment','operator-weapons','sim','combat-readiness','combat-damage','combat-projectiles','transport-operations'])require('../src/'+name+'.js');
function arena(kind='tank',team=0){
 const g=new WarSim.Game({map:'desert',faction:'usa',enemies:1,buffs:['vision'],abilities:false,rangeMode:'balanced'});
 g.entities=[];g.effects=[];g.ore=[];g.directObstacles=[];g.map.blocked.fill(0);g.map.navalBlocked.fill(0);g.map.tiles.fill(0);g.ai=()=>{};
 for(const tree of WarTrees.ensure(g))WarTrees.damage(g,tree.id,tree.maxHp);
 g.spawn(0,'hq',250,250);g.spawn(1,'hq',5500,3500);g.teams.forEach(t=>{t.money=100000;t.queue=[];t.buildQueue=[];});
 const e=g.spawn(team,kind,1800,1600);e.angle=e.turret=0;g.spatial.rebuild(g.entities);return {g,e};
}
function advance(g,seconds,fn){for(let n=0;n<Math.ceil(seconds/.05);n++){g.time+=.05;fn(.05);}}
module.exports={arena,advance};
