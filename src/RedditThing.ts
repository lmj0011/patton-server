

export class RedditThing {
    readonly id: string
    readonly url: URL
    readonly kind: string
    readonly fullName: string
    readonly subredditNamePrefixed: string

    constructor(url: string) {
        const redditUrl = new URL(url)

        if(!["https://www.reddit.com", "https://reddit.com"].includes(redditUrl.origin)) {
            throw new TypeError(`Unaccepted url: ${url}`)
        }

        this.url = redditUrl

        const pathArray = this.url.pathname.split("/")
        const pathArrayCount = pathArray.length
 
        console.log(this.url.pathname)

        if(pathArrayCount == 7) {
            // we'll assume the share url is from the Reddit official mobile app
            while(pathArray.length > 0) {
                let ele = pathArray.shift()

                /**
                 * example payload for this case:
                 * 
                 * pathArray: [ '', 'r', 'dankvideos', 'comments', 'vnz6e0', 'time', '' ]
                 * thing.url: https://www.reddit.com/r/dankvideos/comments/vnz6e0/time/
                 */
                if(pathArray.length > 1 && ele == "r") {
                    // next element is the subreddit name
                    let ele = pathArray.shift()
                    this.subredditNamePrefixed = `r/${ele}`
                }
    
                /**
                 * example payload for this case:
                 * 
                 * pathArray: [ '', 'r', 'dankvideos', 'comments', 'vnz6e0', 'time', '' ]
                 * thing.url: https://www.reddit.com/r/dankvideos/comments/vnz6e0/time/
                 */
                if(ele == "comments") { 
                    //next element is thing id for Post
                    let id = pathArray.shift()
                    this.kind = "t3"
                    this.id = id
                    this.fullName = `t3_${id}`
                }
    
                /**
                 * example payload for this case:
                 * 
                 * pathArray: [ '', 'r', 'dankvideos', 'comments', 'vnz6e0', 'time', 'ieagig6' ]
                 * thing.url: https://www.reddit.com/r/dankvideos/comments/vnz6e0/time/ieagig6
                 */
                // we're at the last element
                if(pathArray.length == 1 && pathArray[0] != ''){
                    //next element is thing id for Comment
                    let id = pathArray.shift()
                    this.kind = "t1"
                    this.id = id
                    this.fullName = `t1_${id}`
                }
            }

        } else {
            // we'll assume the share url is from the Reddit web app

            while(pathArray.length > 0) {
                let ele = pathArray.shift()

                /**
                 * example payload for this case:
                 * 
                 * pathArray: [ '', 'r', 'privacy', 'comments', 'om9h4p', 'piped_the_privacyfriendly_youtube', '' ]
                 * thing.url: https://www.reddit.com/r/privacy/comments/om9h4p/piped_the_privacyfriendly_youtube/
                 */
                if(pathArray.length > 1 && ele == "r") {
                    // next element is the subreddit name
                    let ele = pathArray.shift()
                    this.subredditNamePrefixed = `r/${ele}`
                }
    
                /**
                 * example payload for this case:
                 * 
                 * pathArray: [ '', 'r', 'privacy', 'comments', 'om9h4p', 'piped_the_privacyfriendly_youtube', '' ]
                 * thing.url: https://www.reddit.com/r/privacy/comments/om9h4p/piped_the_privacyfriendly_youtube/
                 */
                if(ele == "comments") { 
                    //next element is thing id for Post
                    let id = pathArray.shift()
                    this.kind = "t3"
                    this.id = id
                    this.fullName = `t3_${id}`
                }
    
                /**
                 * example payload for this case:
                 * 
                 * pathArray: [ '', 'r', 'privacy', 'comments', 'om9h4p', 'comment', 'h5kk2mh', '' ]
                 * thing.url: https://www.reddit.com/r/privacy/comments/om9h4p/comment/h5kk2mh/
                 */
                if(ele == "comment") {
                    //next element is thing id for Comment
                    let id = pathArray.shift()
                    this.kind = "t1"
                    this.id = id
                    this.fullName = `t1_${id}`
                }
            }
        }
    }
}