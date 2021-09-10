import { interval, fromEvent, from, zip, timer } from 'rxjs'
import { map, scan, filter, merge, flatMap, take, concat, takeUntil, skipLast} from 'rxjs/operators'


type Event = 'keyup' | 'keydown'
type Key = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp'
type ViewType = 'ship' | 'bullet'

const
Constants = new class {
  readonly CanvasWidth = 600;
  readonly CanvasHeight = 600; 
  readonly playerX = 300;
  readonly gameOver = false;

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

    const keyObservable = <T>(e: Event, k: Key, result:() => T) =>
    fromEvent<KeyboardEvent>(document, e)
      .pipe(
        filter(({code})=>code === k),
        map(result))
  
  const
      startLeft = keyObservable('keydown','ArrowLeft', () => new Move(-20)),
      startRight = keyObservable('keydown', 'ArrowRight', () => new Move(20)),
      shoot = keyObservable('keydown', 'ArrowUp', ()=> new Shoot())

    // ship/bullet
    type Body = Readonly<{
      id: string,
      viewType: ViewType,
      pos: Vec,
      width: number,
      height: number,
      vel?: Vec
    }>

    // game state
    type State = Readonly<{
      ship:Body,
      bullets: ReadonlyArray<Body>,
      gameOver: boolean
      }>

      const createCircle = (viewType: ViewType)=> (oid:number)=> (width:number) => (height:number)=> (pos:Vec)=> (vel:Vec)=>
      <Body>{
        pos:pos,
        id: viewType+oid,
        viewType: viewType,
        width: width,
        height: height,
        vel: vel
      }  
  
  function createShip(pos: Vec): Body{
    // create ship at pos
      return{
        id: 'ship',
        viewType: 'ship',
        pos: pos,
        width: 50,
        height: 50
      }
    }
    const reduceState = (s: State, e: Move) => {

      // reference from Tim's Asteroid torusWrap function
      const 
        CanvasSize = 600,
        updatePos = ({x,y}:Vec) => { 
        const checkBound = (v:number) => 
          v < 0 ? 0: 
          v > CanvasSize ? CanvasSize : 
          v;  // only update v if within canvas bounds

        // creates new vec with updated y
        return new Vec(checkBound(x),checkBound(y))
      };
      return <State>
      {
        ship: {...s.ship, pos:updatePos(s.ship.pos.add(new Vec(e.direction, 0)))}
      }
    }
    const initialState: State = {
      ship: createShip(new Vec(300,500)),
      bullets: [],
      gameOver: false
    }
    
    const subscription = interval(10).pipe(
      // stream keyboard events and accumulate in reduceState
      merge(startLeft, startRight),
      scan(reduceState, initialState))
      // subscribe updated state to updateView
      .subscribe(updateView);

      function updateView(s: State) {
        const
          ship = document.getElementById("ship")!
          attr(ship,{transform:`translate(${s.ship.pos.x}, ${s.ship.pos.y})`})

      }

    // update attribute of elements
    const attr = (e: Element, o:any) => { for(const k in o)
      e. setAttribute(k, String(o[k]))
      }
}

// referred from Tim's asteroids code
class Vec {
  constructor(public readonly x: number = 0, public readonly y: number = 0) {}
  add = (b:Vec) => new Vec(this.x + b.x, this.y + b.y)
  sub = (b:Vec) => this.add(b.scale(-1))
  scale = (s:number) => new Vec(this.x*s,this.y*s)
  static Zero = new Vec();
}
  
// the following simply runs your pong function on window load.  Make sure to leave it in place.
if (typeof window != 'undefined')
  window.onload = ()=>{
    spaceinvaders();
  }
  
  
  
