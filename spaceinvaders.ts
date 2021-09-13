import { interval, fromEvent, from, zip, timer,  } from 'rxjs'
import { map, scan, filter, merge, take, concat, takeUntil, skipLast} from 'rxjs/operators'


type Event = 'keyup' | 'keydown'
type Key = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp'
type ViewType = 'ship' | 'bullet' | 'alien'

const
Constants = new class {
  readonly CanvasWidth = 600;
  readonly CanvasHeight = 600; 
  readonly playerX = 300;
  readonly gameOver = false;
  readonly alienDistX = 75;
  readonly alienDistY = 75;
  readonly StartAliens = 24;


}
function spaceinvaders() {
    // Inside this function you will use the classes and functions 
    // from rx.js
    // to add visuals to the svg element in pong.html, animate them, and make them interactive.
    // Study and complete the tasks in observable exampels first to get ideas.
    // Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/ 
    // You will be marked on your functional programming style
    // as well as the functionality that you implement.
    // Document your code!  
    class Move {constructor(public readonly direction:number) {} }
    class Shoot {constructor(){}}
    class Tick {constructor(){}}


    const keyObservable = <T>(e: Event, k: Key, result:() => T) =>
    fromEvent<KeyboardEvent>(document, e)
      .pipe(
        filter(({code})=>code === k),
        map(result))
  
  const
      startLeft = keyObservable('keydown','ArrowLeft', () => new Move(-20)),
      startRight = keyObservable('keydown', 'ArrowRight', () => new Move(20)),
      shoot = keyObservable('keydown', 'ArrowUp', ()=> new Shoot())

    // ship/bullet/alien
    type Body = Readonly<{
      id: string,
      viewType: ViewType,
      pos: Vec,
      width?: number,
      height?: number,
      vel?: Vec,
      hitres?: number,
      shape?: string, 
      color?: string
    }>

    // game state
    type State = Readonly<{
      time: number,
      ship:Body,
      bullets: ReadonlyArray<Body>,
      aliens: ReadonlyArray<Body>,
      alienBullet: ReadonlyArray<Body>,
      gameOver: boolean,
      objCount: number,
      exitObjects: ReadonlyArray<Body>,
      score: number
      }>



  const createBullet = (pos: Vec) => (id:String) => <Body>
    {
      id: id,
      viewType: 'bullet',
      pos: pos,
      width: 1,
      height: 5,
      shape: "ellipse",
      color: "red"
 
    }

  const createAlienBullet = (pos: Vec) => (id: String) => <Body>
    {
      id: id,
      viewType: 'bullet',
      pos: pos,
      width: 3,
      height: 3,
      hitres:1.5,
      shape: "ellipse",
      color: "green"
    }

  const createAlien = (pos: Vec) => (id:String) => <Body>
    {
      id: id,
      viewType: "alien",
      pos: pos,
      width: 30,
      height: 30,
      shape: "rect",
      color: "green"
    }
  
  
  function createShip(pos: Vec): Body{
    // create ship at pos
      return{
        id: 'ship',
        viewType: 'ship',
        pos: pos,
        hitres: 20
      }
    }
  


  const createStartAliens = [...Array(Constants.StartAliens)].map((_,i) => 
  createAlien(new Vec((i%6 + 1)*Constants.alienDistX + 15,
   (Math.floor(i/6) + 1)*Constants.alienDistY + 15))("alien"+i.toString()))
  
  const initialState: State = {
    time: 0,
    ship: createShip(new Vec(300,500)),
    bullets: [],
    alienBullet: [],
    gameOver: false,
    objCount: 0,
    aliens: createStartAliens,
    exitObjects: [],
    score: 0
  }

  const updatePos = ({x,y}:Vec) => { 
    const checkBound = (v:number) => 
      v < 0 ? 15: 
      v > 600 ? 600 -15 : 
      v;  // only update v if within canvas bounds

    // creates new vec with updated y
    return new Vec(checkBound(x),checkBound(y))
  }

  const chooseRandomAlienPos = (s:State) => {
    const randomAlien  = s.aliens[Math.floor(Math.random()*s.aliens.length)]
    return new Vec ( randomAlien.pos.x + 15, randomAlien.pos.y + 30)

  }

  const moveBullet = (b: Body) => <Body>{
    ...b,
    pos: b.pos.add(new Vec(0,-1))
  }

  const moveAlienBullet = (b: Body) => <Body>{
    ...b,
    pos: b.pos.add(new Vec(0,0.5))
  }

  const moveAliens = (b:Body, n1:number, n2:number) => <Body>{
    ...b,
    pos: b.pos.add(new Vec(n1, n2))
  }

  const handleCollisions = (s:State) => {
    const
    shipBulletsCollided = ([a,b]:[Body,Body]) => a.pos.sub(b.pos).len() < a.hitres + b.hitres,
    //to check whether alien bullet hit ship
    shipCollided = s.alienBullet.filter(r => shipBulletsCollided([s.ship,r])).length > 0,
    
    //to check whether aliens pass the border
    passBorder = (b:Body) => b.pos.y > 450,
    alienReach = s.aliens.filter( r => passBorder(r)).length > 0,
    
    //to check whether ship bullet hit aliens
    bulletAlienCollision = ([bullet,alien]:[Body,Body]) => bullet.pos.y < alien.pos.y+30 && bullet.pos.y > alien.pos.y && bullet.pos.x < alien.pos.x+30 && bullet.pos.x > alien.pos.x,
    allBulletsAndAliens = flatMap(s.bullets, b => s.aliens.map(r=>[b,r])),
    collidedBulletsAndAliens = allBulletsAndAliens.filter(bulletAlienCollision),
    collidedBullets = collidedBulletsAndAliens.map(([b,_]) => b),
    collidedAliens = collidedBulletsAndAliens.map(([_,a]) => a),
    cut = except((a:Body)=>(b:Body)=>a.id === b.id)
    
    return <State>{
      ...s,
      bullets : cut(s.bullets)(collidedBullets),
      aliens : cut(s.aliens)(collidedAliens),
      exitObjects: s.exitObjects.concat(collidedAliens,collidedBullets),
      gameOver: shipCollided || alienReach || s.aliens.length == 0,
      score : s.score + collidedAliens.length
    
  }
}


  function getAlienDirectionX(elapsed: number): number{
    if (elapsed % 7000 == 1000)
      return 50
    else if (elapsed % 7000 == 3000)
      return -50
    else if (elapsed % 7000 == 4000)
      return -50
    else if (elapsed % 7000 == 6000)
      return 50
    else 
      return 0
  }

  function getAlienDirectionY(elapsed: number): number{
    if (elapsed % 7000 == 2000)
      return 50
    else if (elapsed % 7000 == 5000)
      return -50
    else if (elapsed % 7000 == 0)
      return 50
    else 
      return 0
  }
  

  

  const tick = (s:State, elapsed: number ) => {
    //for bullet tick
    const outOfRange = (b:Body) => b.pos.x < 0 || b.pos.x > Constants.CanvasWidth || b.pos.y < 0 || b.pos.y > Constants.CanvasHeight,
    outOfRangeBullets:Body[] = s.bullets.filter(outOfRange),
    validBullets = s.bullets.filter(not(outOfRange));
    
    //for alien bullet tick
    const
    outOfRangeAlienBullets:Body[] = s.alienBullet.filter(outOfRange),
    validAlienBullets = s.alienBullet.filter(not(outOfRange));
    
    return handleCollisions({
      ...s,
      time: s.time + elapsed,
      bullets: validBullets.map(moveBullet),
      aliens: s.aliens.map((_,i) => moveAliens(_,getAlienDirectionX(s.time + elapsed) , getAlienDirectionY(s.time + elapsed))),
      alienBullet: validAlienBullets.map(moveAlienBullet),
      objCount: s.objCount,
      exitObjects:[...outOfRangeBullets, ...outOfRangeAlienBullets]
    })
  }
  

  
  const reduceState = (s: State, e: Move|Shoot|Tick) => 
    e instanceof Move ? {...s,
      ship: {...s.ship,  pos:updatePos(s.ship.pos.add(new Vec(e.direction, 0)))},
      alienBullet:s.alienBullet.concat(createAlienBullet(chooseRandomAlienPos(s))("ab"+s.objCount.toString())),
      objCount: s.objCount + 1

    } :
    e instanceof Shoot ?  {...s,
      bullets: s.bullets.concat(createBullet(s.ship.pos.add(new Vec(0, -10)))("ab"+s.objCount.toString())),
      alienBullet: s.alienBullet.concat(createAlienBullet(chooseRandomAlienPos(s))(("b"+s.objCount).toString())), 
      objCount: s.objCount + 2
    } :
    tick(s, 1)
    
  const subscription = interval(10).pipe(
    // stream keyboard events and accumulate in reduceState
    merge(startLeft, startRight, shoot),
    scan(reduceState, initialState))
    // subscribe updated state to updateView
    .subscribe(updateView);

  function updateView(s: State) {
    const svg = document.getElementById("canvas")!
    const ship = document.getElementById("ship")!
      attr(ship,{transform:`translate(${s.ship.pos.x}, ${s.ship.pos.y})`})
        
    const updateBullets = (b:Body) => {
      function createSvgBullet() {
        const v = document.createElementNS(svg.namespaceURI, b.shape)!;
        attr(v,{id:b.id,rx:b.width,ry:b.height, fill: b.color});
        v.classList.add(b.viewType)
        svg.appendChild(v)
        return v;
      }
      const v = document.getElementById(b.id) || createSvgBullet();
      attr(v,{cx:b.pos.x,cy:b.pos.y});
    };

    s.bullets.forEach(updateBullets);
    s.alienBullet.forEach(updateBullets)       

    const updateAliens = (b:Body) => {
      function createSvgAlien() {
        const v = document.createElementNS(svg.namespaceURI, b.shape)!;
        attr(v,{id:b.id,width:b.width,height:b.height, fill: b.color});
        v.classList.add(b.viewType)
        svg.appendChild(v)
        return v;
      }
      const v = document.getElementById(b.id) || createSvgAlien();
      attr(v,{x:b.pos.x,y:b.pos.y});
    };
    s.aliens.forEach(updateAliens);
        
    s.exitObjects.map(o=>document.getElementById(o.id))
      .filter(isNotNullOrUndefined)
      .forEach(v=>{
        try {
          svg.removeChild(v)
        } catch(e) {
        }
      })   
        
    //update score for game
    document.getElementById("score").textContent = s.score.toString();
        
    //function to remove all elements in a list from canvas
    const removeElement = (b: Body) => {
      const remove  = document.getElementById(b.id)!
      svg.removeChild(remove)
    }

    if(s.gameOver){
      //remove all bullet entities from canvas SVG
      s.bullets.forEach(removeElement);
      s.alienBullet.forEach(removeElement);

      //unsubscribe the stream of intervals
      subscription.unsubscribe();
      const msg = document.createElementNS(svg.namespaceURI, "text")!;
      const outcome = document.createElementNS(svg.namespaceURI, "text")!;

      // create message for player to play again
      attr(msg, {x:Constants.CanvasWidth/10,
                y: Constants.CanvasHeight/2,
                class: "restart"
              })
      msg.textContent = "PRESS ANY KEY TO PLAY AGAIN";
      svg.appendChild(msg);

      // create message for whether player wins
      s.score >= Constants.StartAliens ?
      outcome.textContent = "YOU DESTROYED THE ALIENS, YOU WIN!" :
      outcome.textContent = "THE ALIENS HAVE INVADED, YOU LOSE!"
      attr(outcome, {x:Constants.CanvasWidth/6,
                    y: Constants.CanvasHeight/3,
                    class: "outcome"
                  })
      svg.appendChild(outcome);

      // checks for any key press to call spaceInvaders function again (restart game)
      window.onkeydown = function(e: KeyboardEvent) {
      svg.removeChild(msg);
      svg.removeChild(outcome);
      window.onkeydown = null
      spaceinvaders()
      }
    }
  }

  // update attribute of elements
  const attr=(e: Element, o:any) => { for(const k in o)
    e.setAttribute(k, String(o[k]))
    }
}

 
// the following simply runs your space Invaders function on window load.  Make sure to leave it in place.
if (typeof window != 'undefined')
  window.onload = ()=>{
    spaceinvaders();
  }



// All Utility Functions used in this game, taken from Tim's Asteroid Codes with some small modifications
//An Immutable Vector class, in charge of moment s
class Vec {
  constructor(public readonly x: number = 0, public readonly y: number = 0) {}
  add = (b:Vec) => new Vec(this.x + b.x, this.y + b.y)
  sub = (b:Vec) => this.add(b.scale(-1))
  scale = (s:number) => new Vec(this.x*s,this.y*s)
  len = ()=> Math.sqrt(this.x*this.x + this.y*this.y)
  static Zero = new Vec();
}
/**
 * Type guard for use in filters
 * @param input something that might be null or undefined
 */
function isNotNullOrUndefined<T extends Object>(input: null | undefined | T): input is T {
  return input != null;
}

/**
 * apply f to every element of a and return the result in a flat array
 * @param a an array
 * @param f a function that produces an array
 */
 function flatMap<T,U>(
  a:ReadonlyArray<T>,
  f:(a:T)=>ReadonlyArray<U>
): ReadonlyArray<U> {
  return Array.prototype.concat(...a.map(f));
}
const 
/**
 * Composable not: invert boolean result of given function
 * @param f a function returning boolean
 * @param x the value that will be tested with f
 */
  not = <T>(f:(x:T)=>boolean)=> (x:T)=> !f(x),
/**
 * is e an element of a using the eq function to test equality?
 * @param eq equality test function for two Ts
 * @param a an array that will be searched
 * @param e an element to search a for
 */
  elem = 
    <T>(eq: (_:T)=>(_:T)=>boolean)=> 
      (a:ReadonlyArray<T>)=> 
        (e:T)=> a.findIndex(eq(e)) >= 0,
/**
 * array a except anything in b
 * @param eq equality test function for two Ts
 * @param a array to be filtered
 * @param b array of elements to be filtered out of a
 */ 
  except = 
    <T>(eq: (_:T)=>(_:T)=>boolean)=>
      (a:ReadonlyArray<T>)=> 
        (b:ReadonlyArray<T>)=> a.filter(not(elem(eq)(b)))

  
