const rooms = new Map();
const words = [
  "dog","cat","lion","tiger","elephant","giraffe","monkey","zebra","bear","wolf",
  "fox","rabbit","deer","panda","horse","sheep","cow","goat","pig","mouse",
  "rat","snake","frog","lizard","turtle","crocodile","hippo","rhino","kangaroo","koala",
  "squirrel","bat","owl","eagle","parrot","penguin","duck","chicken","rooster","peacock",
  "fish","whale","shark","dolphin","crab","octopus","lobster","jellyfish","seal","bee",
  "butterfly","ant","spider","snail","worm","ladybug","dragonfly","fly","mosquito","camel",

  "apple","banana","orange","grape","mango","pear","lemon","lime","peach","plum",
  "cherry","berry","kiwi","papaya","pineapple","watermelon","melon","strawberry","coconut","pomegranate",
  "tomato","potato","onion","garlic","carrot","cabbage","broccoli","cauliflower","spinach","pepper",
  "chili","cucumber","corn","pumpkin","radish","beetroot","eggplant","peas","bean","lettuce",

  "pizza","burger","sandwich","cake","cookie","donut","bread","muffin","biscuit","pancake",
  "brownie","chocolate","fries","hotdog","omelet","sushi","taco","noodles","pasta","steak",
  "rice","cheese","sausage","meatball","cupcake","pie","waffle","croissant","bagel","dumpling",

  "tree","flower","leaf","grass","bush","rock","stone","mountain","hill","volcano",
  "river","lake","island","forest","cave","beach","sand","cloud","rainbow","snowflake",
  "sun","moon","star","planet","comet","ocean","wave","cliff","desert","valley",
  "mushroom","seed","branch","root","flowerpot","vine","log","stump","pinecone","nest",

  "shirt","pants","jeans","jacket","coat","dress","skirt","socks","shoes","boots",
  "hat","cap","belt","tie","gloves","scarf","sweater","hoodie","uniform","helmet",
  "glasses","watch","ring","bracelet","necklace","earring","mask","bag","backpack","purse",

  "chair","table","bed","sofa","couch","desk","lamp","clock","mirror","curtain",
  "carpet","pillow","blanket","mat","shelf","cabinet","drawer","door","window","key",
  "lock","vase","basket","bucket","bottle","plate","cup","glass","spoon","fork",
  "knife","broom","mop","towel","candle","soap","brush","toothbrush","comb","remote",

  "car","bus","truck","train","boat","ship","airplane","helicopter","bicycle","motorbike",
  "scooter","submarine","tram","jeep","van","taxi","rocket","canoe","kayak","yacht",
  "tractor","ambulance","policecar","firetruck","cart","skateboard","sled","surfboard","balloon","glider",

  "hammer","nail","screw","screwdriver","wrench","saw","drill","pliers","ladder","tape",
  "brush","roller","bucket","spade","shovel","axe","pickaxe","wheelbarrow","rake","hoe",
  "computer","laptop","keyboard","mouse","monitor","printer","phone","tablet","camera","speaker",
  "headphones","mic","fan","bulb","charger","battery","cable","switch","router","radio",

  "ball","bat","racket","net","goal","helmet","glove","jersey","trophy","medal",
  "whistle","cone","bench","field","stick","skate","ski","kite","frisbee","board",

  "book","notebook","pen","pencil","marker","crayon","eraser","sharpener","scale","ruler",
  "compass","bag","folder","envelope","paper","tape","glue","paint","palette","brush",

  "house","apartment","hut","tent","barn","cottage","villa","castle","palace","tower",
  "bridge","road","street","park","garden","fountain","playground","stadium","theater","library",
  "church","temple","mosque","shop","market","school","college","hospital","office","garage",

  "dragon","unicorn","mermaid","wizard","fairy","robot","alien","ghost","monster","knight",
  "castle","sword","shield","crown","torch","wand","map","treasure","scroll","potion",

  "head","face","eye","ear","nose","mouth","hair","hand","arm","leg",
  "foot","finger","toe","knee","neck","shoulder","elbow","back","chest","stomach",

  "balloon","gift","ribbon","flag","banner","starfish","shell","anchor","wheel","gear",
  "rocket","clock","dice","coin","keychain","lantern","crown","feather","nest","egg"
];


export {rooms, words};