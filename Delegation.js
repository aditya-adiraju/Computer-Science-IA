/*A Delegation refers to a group of delegates
participating in the conference */
class Delegation{
    constructor(school, size, delegates){
        this.size = size;
        this.school = school;
        this.delegates = delegates
    }
    addDelegate(newDelegate){
        this.delegates.push(newDelegate)
    }
    removeDelegate(delegate){
        const index = this.delegates.indexOf(delegate);
        if (index > -1) {
            this.delegates.splice(index, 1);
        }
    }
    displayDelegates(){
        this.delegates.forEach((item) => {
            console.log(item);
          });
    }
}