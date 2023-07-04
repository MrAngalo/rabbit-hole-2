jQuery(function() {
    
    //Might be overkill. 99% of the time this function will
    //be called once, and 99.99% no more than two times.
    //
    //tenor only accept requests up to 50 gifs, so we break
    //html_imgs down into multiple batches if larger

    var token = $('.gallery').attr('token');
    var html_imgs = $('.tenor-load');
    var batch_size = 50;

    //recursion is necessary to not spam POST requests as would happen in a for loop
    function requestTenorInBatches(b_start, callback) {
        //stop recursion
        if (b_start >= html_imgs.length) return;

        //b_start signifies the start of the batch index, 0, 50, 100, 150 ...
        //b_last signifies the end of the batch index, 49, 99, 149, ... but never more than html_imgs.length
        var b_last = Math.min(b_start + batch_size, html_imgs.length) -1;

        var gif_ids = [];
        for (var i = b_start; i <= b_last; i++) {
            var img = $(html_imgs[i]);
            var gif_id = img.attr('gif-id');
            gif_ids.push(gif_id);
        }

        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/tenor/find', true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.onreadystatechange = () => { // Call a function when the state changes
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                var response = JSON.parse(xhr.response);
                callback(response, b_start, b_last);
                requestTenorInBatches(b_last+1, callback);
            }
        }
        xhr.send(`_csrf=${token}&id=${gif_ids.join(',')}`);
    }

    requestTenorInBatches(0, (response, b_start, b_last) => {
        var size = b_last - b_start;
        for (var i = 0; i <= size; i++) {
            var src = response["results"][i]["media"][0]["gif"]["url"];
            var img = $(html_imgs[b_start + i]);
            $(img).attr('src', src);
        }
    });
});