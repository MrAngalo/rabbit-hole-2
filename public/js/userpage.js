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
            var src = response["response"][i]["media"][0]["gif"]["url"];
            var img = $(html_imgs[b_start + i]);
            $(img).attr('src', src);
        }
    });
});

jQuery(function() {

    $('.save-form').on("submit", (event) => {
        event.preventDefault();
        const form = event.target; /* HTMLFormElement */

        const submit = $(form).children('button[type=submit]').first();
        submit.prop('disabled', true)
        submit.text("Saving Settings");

        const xhr = new XMLHttpRequest();
        xhr.open(form.method, form.action, true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded")

        xhr.onreadystatechange = () => { // Call a function when the state changes
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                var response = JSON.parse(xhr.response);
                //the button will not reset, forcing user to reload page
                if (response.code !== 200) {
                    submit.text("Something Has Gone Wrong");
                    console.log(response);
                    return;
                }
                submit.text("Saved, Reloading");
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            }
        }
        let data = [];
        for (const pair of new FormData(form)) {
            data.push(`${pair[0]}=${pair[1]}`);
        }
        xhr.send(data.join('&'));
    });
});

jQuery(function () {
    var lmt = 30;
    $('.text').on('keyup', function(e) {
        $(".searched_content").empty();
        var query = $(".text").val();
        var token = $('.text').attr('token');
        
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/tenor/search', true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.onreadystatechange = () => { // Call a function when the state changes.
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                var a = JSON.parse(xhr.response);
                var i = 0;
                while (i < a['response'].length) {
                    var src = a["response"][i]["media"][0]["tinygif"]["url"];
                    var id = a['response'][i]['id'];
                    var img = $('<img />')
                    .addClass('pic')
                    .attr('src', src)
                    .attr('gif-id', id)
                    .on('click', function(e) {
                        $('#gifId').val($(this).attr('gif-id')+"").trigger('keyup');
                    });
                    $(".searched_content").append(img);
                    i++;
                }
            }
        }
        xhr.send(`_csrf=${token}&q=${query}&limit=${lmt}`);
    })

    $('#gifId').on('keyup', function(e) {
        var token = $('#gifId').attr('token');
        var gif_id = $('#gifId').val();

        if (gif_id == '')
            return;

        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/tenor/find', true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.onreadystatechange = () => { // Call a function when the state changes.
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                var a = JSON.parse(xhr.response);
                var src = '/img/no-gif.png';
                if (a['response'].length != 0) {
                    src = a['response'][0]['media'][0]['gif']['url'];
                }
                $('.preview-gif').attr('src', src)
            } else if (xhr.status === 400 ) {
                var src = '/img/no-gif.png';
                $('.preview-gif').attr('src', src);
            }
        }
        xhr.send(`_csrf=${token}&id=${gif_id}`);
    }).trigger('keyup');
})