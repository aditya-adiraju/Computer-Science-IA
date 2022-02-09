class Node{
    constructor(){
        this.children = {}
        this.leaf = true 
    }
}
class Trie {
constructor(word_list) {
    // INITIALIZE THE ROOT
    const root = new Node()
    word_list.forEach(word => {
        insertWord(root, word)
    });
    this.root = root
}

insertWord(parentNode, word) {
    for(const character of word){
        if(parentNode.children[character] === undefined){
            parentNode.children[char] = new Node()
        }
        parentNode = parentNode.children[character]
    }
    parentNode.leaf = true;
}


isStartsWith(input) {
    let node = this.root,
    found = true,
    word = '';

for (const char of input) {
  // CHECK IF THE CHARACTER EXIST
  if (node.children[char]) {
    node = node.children[char];
    word += char;
  } else if (node.children[char.toUpperCase()]) { // CASE INSENITIVE
    node = node.children[char.toUpperCase()];
    word += char.toUpperCase();
  } else {
    found = false;
    break;
  }
}

// RETURNS THE CURRENT NODE AND WORD
return {
  node: (found ? node : null),
  word,
};
}


getAutocompleteListDfs(input) {
// CHECK IF IT STARTS WITH INPUT
const { node, word } = this.isStartsWith(input);

// RETURN EMPTY ARRAY IF NO MATCH
if (!node) {
    return [];
}

const words = [];

// ADD TO THE RESULT IF THE CURRENT NODE ALSO THE LAST OF A WORD
if (node.last) {
    words.push(word);
}

return words.concat(this.getWordsDepthFirstSearch(word, node));
}


getAutocompleteListBfs(input) {
// CHECK IF IT STARTS WITH INPUT
const { node, word } = this.isStartsWith(input);

// RETURN EMPTY ARRAY IF NO MATCH
if (!node) {
    return [];
}

const words = [];

// ADD TO THE RESULT IF THE CURRENT NODE ALSO THE LAST OF A WORD
if (node.last) {
    words.push(word);
}

return words.concat(this.getWordsBreathFirstSearch(word, node));
}

/**
 * GET ALL THE WORDS FROM THE GIVEN NODE
 * USING DEPTH FIRST SEARCH ALGORITHM
 * @param {string} prefix
 * @param {Node} node 
 * @return {string[]} An array of words
 * @time complexity: O(N) where N is the size of node
 * @space complexity: O(N) where N is the size of node
 */
getWordsDepthFirstSearch(prefix, node) {
    if (!node) {
    return;
    }

    let words = [];

    for (const char in node.children) {
    // IF THIS IS THE END OF THE WORD
    if (node.children[char].last) {
        // CONCATENATE THE PREVIOUS CHARACTERS AND THE CURRENT CHARACTER
        // ADD IT TO THE WORDS
        words.push(prefix + char);
    }

    words = [
        ...words,
        ...this.getWordsDepthFirstSearch(prefix + char, node.children[char]) // RECURSIVELY GET THE REST OF THE CHARACTERS
    ];
    }

    return words;
}

/**
 * GET ALL THE WORDS FROM THE GIVEN NODE
 * USING BREATH FIRST SEARCH ALGORITHM
 * @param {string} prefix
 * @param {Node} node 
 * @return {string[]} An array of words
 * @time complexity: O(N) where N is the size of node
 * @space complexity: O(N) where N is the size of node
 */
getWordsBreathFirstSearch(prefix, node) {
    const words = [];
    const queue = [
    { node, prefix }
    ];

    while (queue.length) {
    const { node, prefix } = queue.shift();

    for (const key in node.children) {
        // IF THIS IS THE END OF THE WORD
        if (node.children[key].last) {
        // CONCATENATE THE PREVIOUS CHARACTERS AND THE CURRENT CHARACTER
        // ADD IT TO THE WORDS
        words.push(prefix + key);
        }

        // ADD TO THE QUEUE
        queue.push({
        node: node.children[key],
        prefix: prefix + key,
        });
    }
    }

    return words;
}
}

function autocomplete(inp, list) {
/*the autocomplete function takes two arguments,
the text field element and an array of possible autocompleted values:*/
var currentFocus;
/*execute a function when someone writes in the text field:*/
inp.addEventListener("input", function(e) {
    var a, b, i, val = this.value;
    /*close any already open lists of autocompleted values*/
    closeAllLists();
    if (!val) { return false;}
    currentFocus = -1;
    /*create a DIV element that will contain the items (values):*/
    a = document.createElement("DIV");
    a.setAttribute("id", this.id + "autocomplete-list");
    a.setAttribute("class", "autocomplete-items");
    /*append the DIV element as a child of the autocomplete container:*/
    this.parentNode.appendChild(a);

    console.log(list)
    const trie = new Autocomplete(list)
    console.log(trie);
    var arr = trie.getAutocompleteListBfs(inp.value)

    
    console.log(arr)
    /*for each item in the array...*/
    for (i = 0; i < arr.length; i++) {
        /*check if the item starts with the same letters as the text field value:*/
        if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
        /*create a DIV element for each matching element:*/
        b = document.createElement("DIV");
        /*make the matching letters bold:*/
        b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
        b.innerHTML += arr[i].substr(val.length);
        /*insert a input field that will hold the current array item's value:*/
        b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
        /*execute a function when someone clicks on the item value (DIV element):*/
        b.addEventListener("click", function(e) {
            /*insert the value for the autocomplete text field:*/
            inp.value = this.getElementsByTagName("input")[0].value;
            /*close the list of autocompleted values,
            (or any other open lists of autocompleted values:*/
            closeAllLists();
        });
        a.appendChild(b);
        }
    }
});
/*execute a function presses a key on the keyboard:*/
inp.addEventListener("keydown", function(e) {
    var x = document.getElementById(this.id + "autocomplete-list");
    if (x) x = x.getElementsByTagName("div");
    if (e.keyCode == 40) {
        /*If the arrow DOWN key is pressed,
        increase the currentFocus variable:*/
        currentFocus++;
        /*and and make the current item more visible:*/
        addActive(x);
    } else if (e.keyCode == 38) { //up
        /*If the arrow UP key is pressed,
        decrease the currentFocus variable:*/
        currentFocus--;
        /*and and make the current item more visible:*/
        addActive(x);
    } else if (e.keyCode == 13) {
        /*If the ENTER key is pressed, prevent the form from being submitted,*/
        e.preventDefault();
        if (currentFocus > -1) {
        /*and simulate a click on the "active" item:*/
        if (x) x[currentFocus].click();
        }
    }
});
function addActive(x) {
    /*a function to classify an item as "active":*/
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    /*add class "autocomplete-active":*/
    x[currentFocus].classList.add("autocomplete-active");
}
function removeActive(x) {
    /*a function to remove the "active" class from all autocomplete items:*/
    for (var i = 0; i < x.length; i++) {
    x[i].classList.remove("autocomplete-active");
    }
}
function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document,
    except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
    if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
    }
    }
}
/*execute a function when someone clicks in the document:*/
document.addEventListener("click", function (e) {
    closeAllLists(e.target);
});
}
