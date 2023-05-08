jQuery(function() {
    $('.tenor-load').each(function(i, img) {
        var token = $(img).attr('token');
        var gif_id = $(img).attr('gif-id');

        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/gif', true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.onreadystatechange = () => { // Call a function when the state changes.
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                var a = JSON.parse(xhr.response);
                var src = a["results"][0]["media"][0]["gif"]["url"];
                $(img).attr('src', src);
            }
        }
        xhr.send(`_csrf=${token}&id=${gif_id}`);
    });
});